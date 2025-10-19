import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { summarizeScreenshot, generateEmailFromContext, generateCalendarFromContext } from '../services/gemini';
import { getRandomEmailScenario, getRandomCalendarScenario, getEmailScenarioById, getCalendarScenarioById } from '../data/mockScenarios';
import { createTask, getPendingTasks, markTaskAsHandled, getTaskById, updateTask, deleteTask } from '../services/db';
import monitorRouter from './monitor';
import contextRouter from './context';
import chatRouter from './chat';
import voiceRouter from './voice';

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
router.use('/chat', chatRouter);
router.use('/voice', voiceRouter);

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

router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await getTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task' });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ success: false, error: 'Type and data are required' });
    }
    
    // Check if task exists
    const existingTask = await getTaskById(id);
    if (!existingTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    await updateTask(id, type, data);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if task exists
    const existingTask = await getTaskById(id);
    if (!existingTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    await deleteTask(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

export default router;
