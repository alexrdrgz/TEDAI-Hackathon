// Background service worker for TEDAI Chrome Extension
console.log('TEDAI AI Agent background script loaded');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('TEDAI AI Agent installed:', details.reason);
});

// Handle service worker errors
self.addEventListener('error', (event) => {
  console.error('Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service worker unhandled rejection:', event.reason);
});

// Import task storage service (Note: In a real implementation, you'd need to bundle this)
// For now, we'll implement the core functionality directly

// Task queue management
const STORAGE_KEY = 'tedai_task_queue';

async function getTasks() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  return result[STORAGE_KEY] || [];
}

async function updateBadgeCount() {
  const tasks = await getTasks();
  const pendingCount = tasks.filter(task => task.status === 'pending').length;
  
  if (pendingCount > 0) {
    chrome.action.setBadgeText({ text: pendingCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Listen for messages to add tasks to queue
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  try {
    if (message.type === 'ADD_TASK') {
      handleAddTask(message.task).catch(error => {
        console.error('Error handling ADD_TASK:', error);
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'UPDATE_TASK') {
      handleUpdateTask(message.taskId, message.updates).catch(error => {
        console.error('Error handling UPDATE_TASK:', error);
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'GET_TASKS') {
      handleGetTasks(sendResponse).catch(error => {
        console.error('Error handling GET_TASKS:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response
    }
  } catch (error) {
    console.error('Error in message listener:', error);
  }
});

async function handleAddTask(task) {
  try {
    const tasks = await getTasks();
    tasks.push({
      ...task,
      id: generateTaskId(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
    
    await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
    await updateBadgeCount();
    
    console.log('Task added to queue:', task);
  } catch (error) {
    console.error('Failed to add task:', error);
  }
}

async function handleUpdateTask(taskId, updates) {
  try {
    const tasks = await getTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
      await updateBadgeCount();
      
      // Handle snooze alarms
      if (updates.status === 'snoozed' && updates.snoozedUntil) {
        const alarmName = `snooze_${taskId}`;
        const alarmTime = new Date(updates.snoozedUntil).getTime();
        
        chrome.alarms.create(alarmName, { when: alarmTime });
      }
    }
  } catch (error) {
    console.error('Failed to update task:', error);
  }
}

async function handleGetTasks(sendResponse) {
  try {
    const tasks = await getTasks();
    sendResponse({ success: true, tasks });
  } catch (error) {
    console.error('Failed to get tasks:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle snooze alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('snooze_')) {
    const taskId = alarm.name.replace('snooze_', '');
    await handleUpdateTask(taskId, { 
      status: 'pending', 
      snoozedUntil: null 
    });
  }
});

// Initialize badge count on startup
(async () => {
  try {
    await updateBadgeCount();
  } catch (error) {
    console.error('Failed to initialize badge count:', error);
  }
})();

// Utility function to generate unique task IDs
function generateTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Manual trigger for testing (can be called from console)
// Note: Service workers don't have window object, so we'll use chrome.runtime instead
globalThis.addTestEmailTask = async function() {
  const testTask = {
    type: 'email',
    data: {
      to: 'test@example.com',
      subject: 'Test Email from TEDAI',
      body: 'This is a test email created by the TEDAI AI Agent.'
    }
  };
  
  await handleAddTask(testTask);
  console.log('Test email task added');
};
