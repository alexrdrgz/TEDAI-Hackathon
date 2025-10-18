import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import monitorRouter from './monitor';
import contextRouter from './context';

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

export default router;
