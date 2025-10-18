import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshotStructured, generateTimelineEntry } from '../services/gemini-structured';
import { addSnapshot, getSessionSnapshots, getLastSessionSnapshot, getSessionTimeline, updateSessionTimeline } from '../services/db';
import { startStreaming, stopStreaming, isStreamingActive } from '../services/streaming';

const router = Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello World' });
});

router.get('/python', (req, res) => {
  const pythonProcess = spawn('python3', [path.join(__dirname, '../../script.py')]);
  let output = '';
  let error = '';

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      res.json({ result: output.trim() });
    } else {
      res.status(500).json({ error: error || 'Python script failed' });
    }
  });
});

router.get('/screenshot', async (req, res) => {
  try {
    const width = req.query.width ? parseInt(req.query.width as string) : null;
    const height = req.query.height ? parseInt(req.query.height as string) : null;

    const args = [];
    if (width) args.push(width.toString());
    if (height) args.push(height.toString());

    const pythonProcess = spawn('python3', [path.join(__dirname, '../../screen_monitor/get_screenshot.py'), ...args]);
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
          const summary = await summarizeScreenshotStructured(
            filePath,
            previousSnapshot ? { Caption: previousSnapshot.caption, FullDescription: '', Changes: previousSnapshot.changes, Facts: [] } : undefined
          );
          
          // If there's no previous snapshot, ensure Changes is empty array
          if (!previousSnapshot) {
            summary.Changes = [];
          }
          
          // Store in database
          await addSnapshot(filePath, summary.Caption, summary.FullDescription, summary.Changes, summary.Facts, sessionId);
          
          // Generate and append timeline entry
          const currentTimeline = await getSessionTimeline(sessionId);
          const timestamp = new Date().toISOString();
          const newEntry = await generateTimelineEntry(currentTimeline, summary.Caption, summary.Changes, timestamp);
          const updatedTimeline = currentTimeline ? `${currentTimeline}\n\n${newEntry}` : newEntry;
          await updateSessionTimeline(sessionId, updatedTimeline);
          
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

router.get('/session-context', async (req, res) => {
  try {
    const sessionId = (req.query.sessionId as string) || '0';
    const timeline = await getSessionTimeline(sessionId);
    
    if (!timeline) {
      return res.json({ message: 'No timeline for this session', timeline: '' });
    }
    
    res.json({ sessionId, timeline });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: (err as Error).message });
  }
});

export default router;
