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
  console.log('Message type:', message.type);
  
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
    } else if (message.type === 'ADD_TEST_EMAIL_TASK') {
      console.log('Handling ADD_TEST_EMAIL_TASK message...');
      globalThis.addTestEmailTask().then(() => {
        console.log('Email task added successfully');
        sendResponse({ success: true });
      }).catch(error => {
        console.error('Error handling ADD_TEST_EMAIL_TASK:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'ADD_TEST_CALENDAR_TASK') {
      console.log('Handling ADD_TEST_CALENDAR_TASK message...');
      globalThis.addTestCalendarTask().then(() => {
        console.log('Calendar task added successfully');
        sendResponse({ success: true });
      }).catch(error => {
        console.error('Error handling ADD_TEST_CALENDAR_TASK:', error);
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

// Poll for tasks from server
const API_BASE_URL = 'http://localhost:3000/api';
let pollingInterval = null;

async function pollForTasks() {
  try {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    if (!response.ok) {
      console.error('Failed to fetch tasks:', response.status);
      return;
    }
    
    const { tasks } = await response.json();
    
    if (tasks && tasks.length > 0) {
      // Add new tasks to local storage
      const existingTasks = await getTasks();
      const existingTaskIds = new Set(existingTasks.map(t => t.id));
      
      for (const task of tasks) {
        if (!existingTaskIds.has(task.id)) {
          await handleAddTask(task);
          
          // Mark task as handled on server
          await fetch(`${API_BASE_URL}/tasks/${task.id}/handled`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error polling for tasks:', error);
  }
}

// Start polling
function startPolling() {
  if (pollingInterval) return;
  
  // Disable polling for now to avoid CORS issues
  console.log('Polling disabled - tasks will be managed locally');
  return;
  
  pollingInterval = setInterval(pollForTasks, 500);
  console.log('Started polling for tasks every 500ms');
  
  // Initial poll
  pollForTasks();
}

// Initialize badge count and start polling on startup
(async () => {
  try {
    await updateBadgeCount();
    startPolling();
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
})();

// Utility function to generate unique task IDs
function generateTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Manual trigger for testing (can be called from console)
// Note: Service workers don't have window object, so we'll use chrome.runtime instead
globalThis.addTestEmailTask = async function() {
  try {
    console.log('=== addTestEmailTask function called ===');
    console.log('Triggering email task generation...');
    
    const response = await fetch(`${API_BASE_URL}/generate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Email task generation triggered:', result);
    console.log('Task will appear via polling...');
  } catch (error) {
    console.error('Failed to trigger test email task:', error);
  }
};

globalThis.addTestCalendarTask = async function() {
  try {
    console.log('=== addTestCalendarTask function called ===');
    console.log('Triggering calendar task generation...');
    
    const response = await fetch(`${API_BASE_URL}/generate-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Calendar task generation triggered:', result);
    console.log('Task will appear via polling...');
  } catch (error) {
    console.error('Failed to trigger test calendar task:', error);
  }
};
