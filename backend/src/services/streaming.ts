import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshot, generateTimelineEntry } from './gemini';
import { addSnapshot, getLastSessionSnapshot } from './snapshots';
import { getSessionTimeline, addTimelineEntry } from './timeline';

let isStreaming = false;
let streamingTimeout: NodeJS.Timeout | null = null;
let lastScreenshotTime = 0;
let lastScreenshotPath: string | null = null;

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

    // Generate and append timeline entry
    const currentTimeline = await getSessionTimeline(sessionId);
    const timestamp = new Date().toISOString();
    const newEntry = await generateTimelineEntry(currentTimeline, summary.Caption, summary.Changes, timestamp);
    await addTimelineEntry(sessionId, newEntry, summary.Caption, timestamp);
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
      
      // Heuristic logic
      if (percentDifferent > 15 && timeSinceLastScreenshot >= 10000) {
        // More than 15% different and at least 10 seconds have passed
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
        console.log('Taking screenshot...');
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
  if (isStreaming) return;
  
  isStreaming = true;
  lastScreenshotTime = 0;
  lastScreenshotPath = null;
  monitorAndScreenshot();
}

export function stopStreaming(): void {
  isStreaming = false;
  if (streamingTimeout) {
    clearTimeout(streamingTimeout);
    streamingTimeout = null;
  }
}

export function isStreamingActive(): boolean {
  return isStreaming;
}
