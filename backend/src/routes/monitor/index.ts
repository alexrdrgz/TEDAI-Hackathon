import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshot, generateTimelineEntry, checkAndGenerateTask } from '../../services/gemini';
import { addSnapshot, getLastSessionSnapshot } from '../../services/snapshots';
import { getSessionTimeline, addTimelineEntry } from '../../services/timeline';
import { startStreaming, stopStreaming, isStreamingActive } from '../../services/streaming';

const router = Router();

router.get('/screenshot', async (req, res) => {
  try {
    const width = req.query.width ? parseInt(req.query.width as string) : null;
    const height = req.query.height ? parseInt(req.query.height as string) : null;

    const args = [];
    if (width) args.push(width.toString());
    if (height) args.push(height.toString());
    // debug: wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pythonProcess = spawn('python3', [path.join(__dirname, '../../../screen_monitor/get_screenshot.py'), ...args]);
    let screenshotPath = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      screenshotPath += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const filePath = screenshotPath.trim();
          const sessionId = req.query.sessionId as string || 'default';
          
          // Get previous snapshot for context
          const previousSnapshot = await getLastSessionSnapshot(sessionId);
          
          // Summarize with context - only pass previous summary if it exists
          const summary = await summarizeScreenshot(
            filePath,
            previousSnapshot ? { Caption: previousSnapshot.caption, FullDescription: '', Changes: previousSnapshot.changes, Facts: [] } : undefined
          );
          
          // If there's no previous snapshot, ensure Changes is empty array
          if (!previousSnapshot) {
            summary.Changes = [];
          }
          
          // Store in database
          await addSnapshot(filePath, summary.Caption, summary.FullDescription, summary.Changes, summary.Facts, sessionId);
          
          // Get current timeline and generate new entry
          const currentTimeline = await getSessionTimeline(sessionId);
          const timestamp = new Date().toISOString();
          const newEntry = await generateTimelineEntry(currentTimeline, summary.Caption, summary.Changes, timestamp);
          await addTimelineEntry(sessionId, newEntry, summary.Caption, timestamp);
          
          // Check if AI should create a task using tools
          checkAndGenerateTask(filePath, summary.Caption, summary.Changes, currentTimeline, summary.FullDescription).catch((err) => {
            console.error('Error checking for task generation:', err);
          });
          
          res.json({ 
            screenshot: filePath, 
            summary,
            timelineUpdated: true
          });
        } catch (err) {
          res.status(500).json({ error: 'Failed to process screenshot', details: (err as Error).message });
        }
      } else {
        res.status(500).json({ error: error || 'Failed to capture screenshot' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/streaming', (req, res) => {
  const on = req.query.on === 'true';
  
  if (on) {
    startStreaming();
    res.json({ status: 'streaming started', isActive: isStreamingActive() });
  } else {
    stopStreaming();
    res.json({ status: 'streaming stopped', isActive: isStreamingActive() });
  }
});

export default router;
