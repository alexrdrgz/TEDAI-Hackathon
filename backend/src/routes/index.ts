import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshot, generateEmailFromContext, generateCalendarFromContext } from '../services/gemini';
import { getRandomEmailScenario, getRandomCalendarScenario, getEmailScenarioById, getCalendarScenarioById } from '../data/mockScenarios';
import { createTask, getPendingTasks, markTaskAsHandled } from '../services/db';
import monitorRouter from './monitor';
import contextRouter from './context';

const router = Router();

function generateTaskId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

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
    const taskId = generateTaskId();
    await createTask(taskId, generatedTask.type, generatedTask.data);
    
    res.json({ success: true, taskId });
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
    const taskId = generateTaskId();
    await createTask(taskId, generatedTask.type, generatedTask.data);
    
    res.json({ success: true, taskId });
  } catch (error) {
    console.error('Error generating calendar event:', error);
    res.status(500).json({ error: 'Failed to generate calendar event' });
  }
});

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
