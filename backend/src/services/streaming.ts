import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshot, generateTimelineEntry, checkAndGenerateTask, analyzeMessagingForActionItems } from './gemini';
import { addSnapshot, getLastSessionSnapshot } from './snapshots';
import { getSessionTimeline, addTimelineEntry } from './timeline';
import { createTask } from './db';

let isStreaming = false;
let streamingTimeout: NodeJS.Timeout | null = null;
let lastScreenshotTime = 0;
let lastScreenshotPath: string | null = null;

function generateTaskId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function checkScreenDifference(referencePath: string): Promise<number> {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../../screen_monitor/get_screenshot_diff.py'),
      referencePath
    ]);
    let output = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.on('close', () => {
      resolve(parseInt(output.trim()) || 0);
    });
  });
}

async function takeScreenshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [path.join(__dirname, '../../screen_monitor/get_screenshot.py')]);
    let screenshotPath = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      screenshotPath += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(screenshotPath.trim());
      } else {
        reject(new Error(error || 'Failed to capture screenshot'));
      }
    });
  });
}

async function captureAndSaveScreenshot(filePath: string): Promise<void> {
  try {
    const sessionId = '0';
    
    // Get previous snapshot for context
    const previousSnapshot = await getLastSessionSnapshot(sessionId);
    
    // Summarize with context
    const summary = await summarizeScreenshot(
      filePath,
      previousSnapshot ? { Caption: previousSnapshot.caption, FullDescription: '', Changes: previousSnapshot.changes, Facts: [] } : undefined
    );
    
    // If there's no previous snapshot, ensure Changes is empty array
    if (!previousSnapshot) {
      summary.Changes = [];
    }
    
    await addSnapshot(filePath, summary.Caption, summary.FullDescription, summary.Changes, summary.Facts, sessionId);

    // Get current timeline for task generation
    const currentTimeline = await getSessionTimeline(sessionId);
    const timestamp = new Date().toISOString();
    
    // Generate timeline entry and check for tasks in parallel
    const [newEntry, taskCheckResult] = await Promise.all([
      generateTimelineEntry(currentTimeline, summary.Caption, summary.Changes, timestamp),
      checkAndGenerateTask(filePath, summary.Caption, summary.Changes, currentTimeline, summary.FullDescription, summary.isMessagingApp)
    ]);
    
    await addTimelineEntry(sessionId, newEntry, summary.Caption, timestamp);
    
    // If this is a messaging app, use specialized action item detection
    if (summary.isMessagingApp) {
      console.log('📱 [Streaming] Messaging app detected - analyzing for action items...');
      try {
        const actionItems = await analyzeMessagingForActionItems(
          filePath, 
          summary.FullDescription, 
          summary.Caption
        );
        
        console.log(`[Streaming] Found ${actionItems.length} action items in messaging app`);
        
        // Create tasks for each detected action item
        for (const item of actionItems) {
          try {
            const taskId = generateTaskId();
            console.log(`[Streaming] Creating ${item.taskType} task from message:`, item.reasoning);
            await createTask(taskId, item.taskType, item.taskData);
          } catch (taskError) {
            console.error('[Streaming] Error creating messaging action item task:', taskError);
          }
        }
      } catch (messagingError) {
        console.error('[Streaming] Error analyzing messaging app for action items:', messagingError);
        // Fall back to regular task detection
      }
    }
    
    // Create task if recommended by regular Gemini analysis (if not handled by messaging detection)
    if (!summary.isMessagingApp && taskCheckResult?.shouldCreate && taskCheckResult?.taskType) {
      try {
        const taskId = generateTaskId();
        console.log(`[Streaming] Creating ${taskCheckResult.taskType} task:`, taskCheckResult.reasoning);
        await createTask(taskId, taskCheckResult.taskType, taskCheckResult.taskData || {});
      } catch (taskError) {
        console.error('[Streaming] Error creating auto-generated task:', taskError);
      }
    }
  } catch (err) {
    console.error('Error processing screenshot:', err);
  }
}

async function monitorAndScreenshot(): Promise<void> {
  try {
    const now = Date.now();
    const timeSinceLastScreenshot = now - lastScreenshotTime;

    if (!lastScreenshotPath) {
      // First screenshot - take it immediately
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Taking first screenshot...');
      const screenshotPath = await takeScreenshot();
      lastScreenshotPath = screenshotPath;
      lastScreenshotTime = now;
      await captureAndSaveScreenshot(screenshotPath);
    } else {
      // Check screen difference
      const percentDifferent = await checkScreenDifference(lastScreenshotPath);
      
      let shouldTakeScreenshot = false;
      console.log('percentDifferent', percentDifferent);
      console.log('timeSinceLastScreenshot', timeSinceLastScreenshot);
      // Heuristic logic
      if (percentDifferent > 15 && timeSinceLastScreenshot >= 5000) {
        // More than 15% different and at least 5 seconds have passed
        shouldTakeScreenshot = true;
      } else if (percentDifferent > 10 && timeSinceLastScreenshot >= 30000) {
        // More than 10% different and at least 30 seconds have passed
        shouldTakeScreenshot = true;
      } else if (timeSinceLastScreenshot >= 60000) {
        // 60 seconds have passed, screenshot no matter what
        shouldTakeScreenshot = true;
      }
      
      if (shouldTakeScreenshot) {
        // wait 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Taking screenshot... (${percentDifferent}% different, ${Math.round(timeSinceLastScreenshot/1000)}s since last)`);
        const screenshotPath = await takeScreenshot();
        lastScreenshotPath = screenshotPath;
        lastScreenshotTime = now;
        await captureAndSaveScreenshot(screenshotPath);
      }
    }

    // Schedule next check in 1 second
    if (isStreaming) {
      streamingTimeout = setTimeout(monitorAndScreenshot, 1000);
    }
  } catch (err) {
    console.error('Error in screen monitoring:', err);
    if (isStreaming) {
      streamingTimeout = setTimeout(monitorAndScreenshot, 1000);
    }
  }
}

export function startStreaming(): void {
  if (isStreaming) {
    console.log('Streaming already active, ignoring start request');
    return;
  }
  
  console.log('Starting screenshot streaming service...');
  isStreaming = true;
  lastScreenshotTime = 0;
  lastScreenshotPath = null;
  monitorAndScreenshot();
  console.log('Screenshot streaming service started successfully');
}

export function stopStreaming(): void {
  if (!isStreaming) {
    console.log('Streaming already stopped, ignoring stop request');
    return;
  }
  
  console.log('Stopping screenshot streaming service...');
  isStreaming = false;
  if (streamingTimeout) {
    clearTimeout(streamingTimeout);
    streamingTimeout = null;
  }
  console.log('Screenshot streaming service stopped successfully');
}

export function isStreamingActive(): boolean {
  return isStreaming;
}
