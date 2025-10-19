import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { summarizeScreenshot, generateTimelineEntry, checkAndGenerateTask } from '../../services/gemini';
import { addSnapshot, getLastSessionSnapshot, getSessionSnapshots, getAllSnapshots } from '../../services/snapshots';
import { getSessionTimeline, addTimelineEntry } from '../../services/timeline';
import { startStreaming, stopStreaming, isStreamingActive } from '../../services/streaming';
import { createTask } from '../../services/db';

const router = Router();

function generateTaskId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

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
          const filename = path.basename(filePath);
          await addSnapshot(filename, summary.Caption, summary.FullDescription, summary.Changes, summary.Facts, sessionId);
          
          // Get current timeline for task generation
          const currentTimeline = await getSessionTimeline(sessionId);
          
          // Generate timeline entry and check for tasks in parallel
          const timestamp = new Date().toISOString();
          
          const [newEntry, taskCheckResult] = await Promise.all([
            generateTimelineEntry(currentTimeline, summary.Caption, summary.Changes, timestamp),
            checkAndGenerateTask(filePath, summary.Caption, summary.Changes, currentTimeline, summary.FullDescription)
          ]);
          
          await addTimelineEntry(sessionId, newEntry, summary.Caption, timestamp);
          
          // Create task if recommended by Gemini
          if (taskCheckResult?.shouldCreate && taskCheckResult?.taskType) {
            try {
              const taskId = generateTaskId();
              console.log(`Creating ${taskCheckResult.taskType} task:`, taskCheckResult.reasoning);
              await createTask(taskId, taskCheckResult.taskType, taskCheckResult.taskData || {});
            } catch (taskError) {
              console.error('Error creating auto-generated task:', taskError);
            }
          }
          
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
  
  console.log(`Monitor streaming request received: on=${on}`);
  
  if (on) {
    startStreaming();
    console.log('Screenshot streaming STARTED - Monitoring is now active');
    res.json({ status: 'streaming started', isActive: isStreamingActive() });
  } else {
    stopStreaming();
    console.log('Screenshot streaming STOPPED - Monitoring is now inactive');
    res.json({ status: 'streaming stopped', isActive: isStreamingActive() });
  }
});

router.get('/timeline/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const snapshots = await getSessionSnapshots(sessionId);
    res.json({ success: true, snapshots });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

router.get('/timeline', async (req, res) => {
  try {
    const snapshots = await getAllSnapshots();
    res.json({ success: true, snapshots });
  } catch (error) {
    console.error('Error fetching all snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

router.get('/screenshot/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../..', 'screenshots', filename);
    
    // Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const screenshotsDir = path.resolve(path.join(__dirname, '../../..', 'screenshots'));
    
    if (!resolvedPath.startsWith(screenshotsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('Error serving screenshot:', error);
    res.status(500).json({ error: 'Failed to serve screenshot' });
  }
});

export default router;
