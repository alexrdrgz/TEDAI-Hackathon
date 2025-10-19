import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { generateEmailFromContext } from '../services/email';
import { generateCalendarFromContext } from '../services/calendar';
import { getRandomEmailScenario, getRandomCalendarScenario, getEmailScenarioById, getCalendarScenarioById } from '../data/mockScenarios';
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

router.post('/generate-email', async (req, res) => {
  try {
    const { scenarioId } = req.body;
    
    let scenario;
    if (scenarioId) {
      scenario = getEmailScenarioById(scenarioId);
      if (!scenario) {
        return res.status(404).json({ error: 'Email scenario not found' });
      }
    } else {
      scenario = getRandomEmailScenario();
    }

    const generatedTask = await generateEmailFromContext(scenario);
    res.json(generatedTask);
  } catch (error) {
    console.error('Error generating email:', error);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

router.post('/generate-calendar', async (req, res) => {
  try {
    const { scenarioId } = req.body;
    
    let scenario;
    if (scenarioId) {
      scenario = getCalendarScenarioById(scenarioId);
      if (!scenario) {
        return res.status(404).json({ error: 'Calendar scenario not found' });
      }
    } else {
      scenario = getRandomCalendarScenario();
    }

    const generatedTask = await generateCalendarFromContext(scenario);
    res.json(generatedTask);
  } catch (error) {
    console.error('Error generating calendar event:', error);
    res.status(500).json({ error: 'Failed to generate calendar event' });
  }
});

export default router;
