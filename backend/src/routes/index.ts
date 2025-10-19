import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { getPendingTasks, markTaskAsHandled } from '../services/db';
import monitorRouter from './monitor';
import contextRouter from './context';
import chatRouter from './chat';
import voiceRouter from './voice';

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

router.use('/monitor', monitorRouter);
router.use('/context', contextRouter);
router.use('/chat', chatRouter);
router.use('/voice', voiceRouter);

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await getPendingTasks();
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/tasks/:id/handled', async (req, res) => {
  try {
    const { id } = req.params;
    await markTaskAsHandled(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking task as handled:', error);
    res.status(500).json({ error: 'Failed to mark task as handled' });
  }
});

export default router;
