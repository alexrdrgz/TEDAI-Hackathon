import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshotStructured, generateTimelineEntry } from './gemini-structured';
import { addSnapshot, getLastSessionSnapshot, getSessionTimeline, addTimelineEntry } from './db';

let isStreaming = false;
let streamingTimeout: NodeJS.Timeout | null = null;

async function captureAndSaveScreenshot(): Promise<void> {
  try {
    const startTime = Date.now();
    
    const pythonProcess = spawn('python3', [path.join(__dirname, '../../screen_monitor/get_screenshot.py')]);
    let screenshotPath = '';
    let error = '';

    await new Promise<void>((resolve, reject) => {
      pythonProcess.stdout.on('data', (data) => {
        screenshotPath += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(error || 'Failed to capture screenshot'));
        }
      });
    });

    const filePath = screenshotPath.trim();
    const sessionId = '0';
    
    // Get previous snapshot for context
    const previousSnapshot = await getLastSessionSnapshot(sessionId);
    
    // Summarize with context
    const summary = await summarizeScreenshotStructured(
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

    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 15000 - elapsedTime);

    if (isStreaming) {
      streamingTimeout = setTimeout(captureAndSaveScreenshot, remainingTime);
    }
  } catch (err) {
    console.error('Error capturing screenshot:', err);
    if (isStreaming) {
      streamingTimeout = setTimeout(captureAndSaveScreenshot, 15000);
    }
  }
}

export function startStreaming(): void {
  if (isStreaming) return;
  
  isStreaming = true;
  captureAndSaveScreenshot();
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
