// Background service worker for TEDAI Chrome Extension
console.log('TEDAI AI Agent background script loaded');

// Configuration
const CONFIG = {
  API_BASE_URL: 'http://localhost:3030/api'
};
console.log('CONFIG loaded:', CONFIG);

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

// Broadcast button state update to all tabs
async function broadcastButtonStateUpdate() {
  try {
    const tasks = await getTasks();
    const pendingCount = tasks.filter(task => task.status === 'pending').length;
    
    console.log('[broadcastButtonStateUpdate] Sending update to all tabs, count:', pendingCount);
    
    // Get all tabs and send message to each
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'UPDATE_BUTTON_STATE',
          taskCount: pendingCount
        }).catch(() => {
          // Tab might not have content script loaded, that's okay
        });
      });
    });
  } catch (error) {
    console.error('[broadcastButtonStateUpdate] Error:', error);
  }
}

// Listen for messages to add tasks to queue
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  console.log('Message type:', message.type);
  
  try {
    if (message.type === 'OPEN_POPUP') {
      console.log('Opening extension popup from toast notification');
      chrome.action.openPopup().catch(() => {
        // If openPopup fails, open in a new window
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html'),
          type: 'popup',
          width: 400,
          height: 600
        });
      });
      sendResponse({ success: true });
      return true;
    } else if (message.type === 'GET_PENDING_TASK_COUNT') {
      handleGetPendingTaskCount(sendResponse).catch(error => {
        console.error('Error handling GET_PENDING_TASK_COUNT:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'GET_PENDING_TASKS') {
      handleGetPendingTasks(sendResponse).catch(error => {
        console.error('Error handling GET_PENDING_TASKS:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'ADD_TASK') {
      handleAddTask(message.task).catch(error => {
        console.error('Error handling ADD_TASK:', error);
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'UPDATE_TASK') {
      handleUpdateTask(message.taskId, message.updates).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        console.error('Error handling UPDATE_TASK:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open for async response
    } else if (message.type === 'APPROVE_TASK') {
      console.log('[Background] Approving task:', message.taskId);
      
      // Get the task first to execute its action
      getTasks().then(async (tasks) => {
        const task = tasks.find(t => t.id === message.taskId);
        
        if (!task) {
          console.error('[Background] Task not found:', message.taskId);
          sendResponse({ success: false, error: 'Task not found' });
          return;
        }
        
        try {
          // Execute the task action (open Gmail/Calendar)
          await executeTaskAction(task);
          
          // Then update the task status
          await handleUpdateTask(message.taskId, { status: 'approved' });
          
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error handling APPROVE_TASK:', error);
          sendResponse({ success: false, error: error.message });
        }
      });
      
      return true; // Keep message channel open for async response
    } else if (message.type === 'REJECT_TASK') {
      console.log('[Background] Rejecting task:', message.taskId);
      handleUpdateTask(message.taskId, { status: 'rejected' }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        console.error('Error handling REJECT_TASK:', error);
        sendResponse({ success: false, error: error.message });
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
        // Notify popup to refresh
        chrome.runtime.sendMessage({ type: 'TASKS_UPDATED' }).catch(() => {});
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
        // Notify popup to refresh
        chrome.runtime.sendMessage({ type: 'TASKS_UPDATED' }).catch(() => {});
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
    console.log('[handleUpdateTask] Updating task:', taskId, 'with updates:', updates);
    const tasks = await getTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
      console.log('[handleUpdateTask] Task updated in storage');
      await updateBadgeCount();
      
      // Handle snooze alarms
      if (updates.status === 'snoozed' && updates.snoozedUntil) {
        const alarmName = `snooze_${taskId}`;
        const alarmTime = new Date(updates.snoozedUntil).getTime();
        
        chrome.alarms.create(alarmName, { when: alarmTime });
      }
      
      // Notify popup to refresh
      chrome.runtime.sendMessage({ type: 'TASKS_UPDATED' }).catch(() => {
        // Popup might not be open, that's okay
      });
      
      // Update sticky button state on all tabs
      await broadcastButtonStateUpdate();
    } else {
      console.log('[handleUpdateTask] Task not found:', taskId);
    }
  } catch (error) {
    console.error('Failed to update task:', error);
  }
}

// Execute task action (open Gmail, Google Calendar, etc.)
async function executeTaskAction(task) {
  try {
    console.log('[executeTaskAction] Executing action for task:', task.type, task.id);
    
    if (task.type === 'email') {
      await openGmailCompose(task.data);
    } else if (task.type === 'calendar') {
      await openGoogleCalendar(task.data);
    } else if (task.type === 'reminder') {
      // Reminders could open Google Calendar or Tasks
      await openGoogleCalendar(task.data);
    }
  } catch (error) {
    console.error('[executeTaskAction] Failed to execute task action:', error);
    throw error;
  }
}

// Open Gmail compose window with pre-filled data
async function openGmailCompose(emailData) {
  console.log('[openGmailCompose] Opening Gmail compose:', emailData);
  const params = new URLSearchParams();
  params.append('to', emailData.to);
  params.append('su', emailData.subject);
  params.append('body', emailData.body);
  
  if (emailData.cc) params.append('cc', emailData.cc);
  if (emailData.bcc) params.append('bcc', emailData.bcc);

  const gmailUrl = `https://mail.google.com/mail/?view=cm&${params.toString()}`;
  
  try {
    await chrome.tabs.create({ url: gmailUrl });
    console.log('[openGmailCompose] Gmail compose window opened');
  } catch (error) {
    console.error('[openGmailCompose] Failed to open Gmail:', error);
    throw error;
  }
}

// Open Google Calendar with pre-filled event data
async function openGoogleCalendar(calendarData) {
  console.log('[openGoogleCalendar] Opening Google Calendar:', calendarData);
  
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams();
  params.append('text', calendarData.title);
  
  // Convert ISO dates to Google Calendar format
  const startDate = new Date(calendarData.startTime);
  const endDate = new Date(calendarData.endTime);
  
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  params.append('dates', `${formatDate(startDate)}/${formatDate(endDate)}`);
  
  if (calendarData.description) {
    params.append('details', calendarData.description);
  }
  
  if (calendarData.location) {
    params.append('location', calendarData.location);
  }
  
  if (calendarData.attendees && calendarData.attendees.length > 0) {
    params.append('add', calendarData.attendees.join(','));
  }
  
  const url = `${baseUrl}&${params.toString()}`;
  
  try {
    await chrome.tabs.create({ url });
    console.log('[openGoogleCalendar] Google Calendar opened');
  } catch (error) {
    console.error('[openGoogleCalendar] Failed to open Google Calendar:', error);
    throw error;
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

async function handleGetPendingTaskCount(sendResponse) {
  try {
    const tasks = await getTasks();
    const pendingCount = tasks.filter(task => task.status === 'pending').length;
    sendResponse({ success: true, count: pendingCount });
  } catch (error) {
    console.error('Failed to get pending task count:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetPendingTasks(sendResponse) {
  try {
    const tasks = await getTasks();
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    sendResponse({ success: true, tasks: pendingTasks });
  } catch (error) {
    console.error('Failed to get pending tasks:', error);
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
    
    // Update button state after snooze alarm
    await broadcastButtonStateUpdate();
  }
});

// Poll for tasks from server
const API_BASE_URL = CONFIG.API_BASE_URL;
let pollingInterval = null;

console.log('Using API Base URL:', API_BASE_URL);

async function pollForTasks() {
  try {
    console.log('[Polling] Fetching tasks from:', `${API_BASE_URL}/tasks`);
    const response = await fetch(`${API_BASE_URL}/tasks`);
    
    if (!response.ok) {
      console.error('[Polling] Failed to fetch tasks:', response.status);
      return;
    }
    
    const { tasks } = await response.json();
    console.log('[Polling] Received tasks:', tasks?.length || 0);
    
    if (tasks && tasks.length > 0) {
      // Add new tasks to local storage
      const existingTasks = await getTasks();
      const existingTaskIds = new Set(existingTasks.map(t => t.id));
      console.log('[Polling] Existing tasks:', existingTaskIds.size);
      
      let newTasksAdded = 0;
      for (const task of tasks) {
        if (!existingTaskIds.has(task.id)) {
          console.log('[Polling] Adding new task:', task.id, task.type);
          await handleAddTask(task);
          
          // Mark task as handled on server
          await fetch(`${API_BASE_URL}/tasks/${task.id}/handled`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          newTasksAdded++;
          
          // Show toast notification on active tab
          console.log('[Polling] New task detected, showing toast notification');
          
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
              const activeTab = tabs[0];
              console.log('[Polling] Sending toast to active tab:', activeTab.id);
              
              chrome.tabs.sendMessage(activeTab.id, {
                type: 'SHOW_TOAST',
                data: task
              }).then(() => {
                console.log('[Polling] ✓ Toast notification sent');
              }).catch(error => {
                console.log('[Polling] ✗ Failed to send toast (tab might not support content scripts):', error.message);
              });
            } else {
              console.log('[Polling] No active tab found for toast notification');
            }
          });
        }
      }
      console.log('[Polling] Added', newTasksAdded, 'new tasks');
      
      // Notify any open popups about the update
      if (newTasksAdded > 0) {
        console.log('[Polling] Broadcasting TASKS_UPDATED message to popup');
        chrome.runtime.sendMessage({ type: 'TASKS_UPDATED' }).catch(() => {
          // Popup might not be open, that's okay
          console.log('[Polling] No popup open to receive update');
        });
        
        // Update sticky button state on all tabs (for when tasks are cleared/completed)
        await broadcastButtonStateUpdate();
      }
    }
  } catch (error) {
    console.error('[Polling] Error:', error);
  }
}

// Make it globally accessible for debugging
globalThis.pollForTasks = pollForTasks;

// Clear all tasks from storage (for debugging/resetting)
globalThis.clearAllTasks = async function() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    await updateBadgeCount();
    console.log('[clearAllTasks] All tasks cleared from storage');
  } catch (error) {
    console.error('[clearAllTasks] Error:', error);
  }
};

// Start polling
function startPolling() {
  console.log('[startPolling] Function called');
  
  if (pollingInterval) {
    console.log('[startPolling] Already polling, skipping');
    return;
  }
  
  console.log('[startPolling] Setting up interval');
  pollingInterval = setInterval(pollForTasks, 5000); // Poll every 5 seconds
  console.log('[startPolling] Started polling for tasks every 5 seconds');
  
  // Initial poll
  console.log('[startPolling] Triggering initial poll');
  pollForTasks();
}

// Initialize badge count and start polling on startup
(async () => {
  try {
    console.log('[Init] Initializing background script...');
    console.log('[Init] API_BASE_URL:', API_BASE_URL);
    
    // Clear any old non-pending tasks on startup
    const allTasks = await getTasks();
    const pendingTasks = allTasks.filter(t => t.status === 'pending');
    if (allTasks.length !== pendingTasks.length) {
      console.log('[Init] Clearing', allTasks.length - pendingTasks.length, 'old processed tasks');
      await chrome.storage.local.set({ [STORAGE_KEY]: pendingTasks });
    }
    
    console.log('[Init] Updating badge count...');
    await updateBadgeCount();
    console.log('[Init] Badge count updated');
    console.log('[Init] Starting polling...');
    startPolling();
    console.log('[Init] Initialization complete');
  } catch (error) {
    console.error('[Init] Failed to initialize:', error);
  }
})();

// Utility function to generate unique task IDs
function generateTaskId() {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Helper function to get task summary for notifications
function getTaskSummary(task) {
  switch (task.type) {
    case 'email':
      return `To: ${task.data.to} - ${task.data.subject}`;
    case 'calendar':
      const startDate = new Date(task.data.startTime);
      const timeStr = startDate.toLocaleDateString() + ' ' + startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const locationStr = task.data.location ? ` @ ${task.data.location}` : '';
      return `${task.data.title} - ${timeStr}${locationStr}`;
    case 'reminder':
      return `Reminder: ${task.data.title}`;
    default:
      return 'New task available';
  }
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
