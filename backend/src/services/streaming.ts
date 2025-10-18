import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshot } from './gemini';
import { addSnapshot } from './db';

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
    const summary = await summarizeScreenshot(filePath);
    await addSnapshot(filePath, summary, '0');

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
