import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshot, generateEmailFromContext, generateCalendarFromContext } from '../services/gemini';
import { getRandomEmailScenario, getRandomCalendarScenario, getEmailScenarioById, getCalendarScenarioById } from '../data/mockScenarios';

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
        const filePath = screenshotPath.trim();
        const summary = await summarizeScreenshot(filePath);
        res.json({ screenshot: filePath, summary });
      } else {
        res.status(500).json({ error: error || 'Failed to capture screenshot' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
