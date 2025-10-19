// Loom-style Sticky Button Notification System for TEDAI Chrome Extension

// State management
let currentState = 'hidden'; // 'hidden', 'small', 'notification', 'queue'
let currentTaskCount = 0;
let stickyButton = null;
let autoCollapseTimeout = null;
let currentSwipeHandler = null;
let currentNotificationTaskId = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[StickyButton] Received message:', message.type);
  
  if (message.type === 'SHOW_TOAST') {
    showNotification(message.data);
    sendResponse({ success: true });
    return false; // Synchronous response
  } else if (message.type === 'UPDATE_BUTTON_STATE') {
    updateButtonState(message.taskCount);
    sendResponse({ success: true });
    return false; // Synchronous response
  }
  return false; // Always return false if not handling asynchronously
});

// Create the sticky button element
function createStickyButton() {
  if (stickyButton) {
    return stickyButton;
  }

  // Add styles if not already added
  if (!document.getElementById('tedai-sticky-styles')) {
    const style = document.createElement('style');
    style.id = 'tedai-sticky-styles';
    style.textContent = `
      .tedai-sticky-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      }

      /* Small button state */
      .tedai-sticky-button.small {
        width: 56px;
        height: 56px;
        border-radius: 28px;
        background: #4493F8;
        box-shadow: 0 4px 16px rgba(68, 147, 248, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tedai-sticky-button.small:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(68, 147, 248, 0.5);
      }

      .tedai-sticky-button.small:active {
        transform: scale(0.95);
      }

      /* Notification state - shows single task with actions */
      .tedai-sticky-button.notification {
        width: 360px;
        max-width: calc(100vw - 40px);
        border-radius: 12px;
        background: #0C1117;
        border: 1px solid #30363D;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        animation: tedai-expand 0.3s ease-out;
      }

      /* Queue state - shows list of all tasks */
      .tedai-sticky-button.queue {
        width: 360px;
        max-width: calc(100vw - 40px);
        max-height: 500px;
        border-radius: 12px;
        background: #0C1117;
        border: 1px solid #30363D;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        animation: tedai-expand 0.3s ease-out;
        display: flex;
        flex-direction: column;
      }

      @keyframes tedai-expand {
        from {
          width: 56px;
          height: 56px;
          border-radius: 28px;
          opacity: 0.8;
        }
        to {
          width: 360px;
          border-radius: 12px;
          opacity: 1;
        }
      }

      /* Button icon */
      .tedai-button-icon {
        width: 32px;
        height: 32px;
        background: #F0F6FC;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        color: #4493F8;
      }

      /* Badge count */
      .tedai-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 20px;
        height: 20px;
        background: #DA3633;
        color: #F0F6FC;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        border: 2px solid #0C1117;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      /* Notification content */
      .tedai-notification-content {
        color: #F0F6FC;
        display: none;
      }

      .tedai-sticky-button.notification .tedai-notification-content {
        display: block;
      }

      .tedai-sticky-button.notification .tedai-button-icon {
        display: none;
      }

      /* Queue view content */
      .tedai-queue-content {
        color: #F0F6FC;
        display: none;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .tedai-sticky-button.queue .tedai-queue-content {
        display: flex;
      }

      .tedai-sticky-button.queue .tedai-button-icon {
        display: none;
      }

      .tedai-queue-header {
        display: flex;
        align-items: center;
        padding: 16px 16px 12px 16px;
        border-bottom: 1px solid #30363D;
        flex-shrink: 0;
      }

      .tedai-queue-title {
        flex: 1;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .tedai-queue-close {
        background: none;
        border: none;
        color: #F0F6FC;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
        opacity: 0.7;
      }

      .tedai-queue-close:hover {
        background: #30363D;
        opacity: 1;
      }

      .tedai-queue-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .tedai-queue-list::-webkit-scrollbar {
        width: 6px;
      }

      .tedai-queue-list::-webkit-scrollbar-track {
        background: #161B22;
        border-radius: 3px;
      }

      .tedai-queue-list::-webkit-scrollbar-thumb {
        background: #484F58;
        border-radius: 3px;
      }

      .tedai-queue-list::-webkit-scrollbar-thumb:hover {
        background: #6E7681;
      }

      .tedai-queue-item {
        background: #161B22;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid #30363D;
        transition: background 0.2s;
      }

      .tedai-queue-item:hover {
        background: #21262D;
      }

      .tedai-queue-item:last-child {
        margin-bottom: 0;
      }

      .tedai-queue-item-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }

      .tedai-queue-item-type {
        background: #21262D;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #8B949E;
      }

      .tedai-queue-item-time {
        font-size: 11px;
        opacity: 0.7;
      }

      .tedai-queue-item-summary {
        font-size: 13px;
        line-height: 1.4;
        opacity: 0.95;
      }

      .tedai-queue-empty {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.7;
      }

      .tedai-queue-empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .tedai-queue-empty-text {
        font-size: 14px;
      }

      .tedai-queue-footer {
        border-top: 1px solid #30363D;
        padding: 12px 16px;
        flex-shrink: 0;
      }

      .tedai-queue-footer-btn {
        width: 100%;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        background: #4493F8;
        color: #F0F6FC;
      }

      .tedai-queue-footer-btn:hover {
        background: #58A6FF;
        transform: translateY(-1px);
      }

      .tedai-notification-header {
        display: flex;
        align-items: center;
        padding: 16px 16px 12px 16px;
        border-bottom: 1px solid #30363D;
      }

      .tedai-notification-icon {
        width: 32px;
        height: 32px;
        background: #21262D;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
        margin-right: 12px;
        color: #4493F8;
      }

      .tedai-notification-title {
        flex: 1;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .tedai-notification-close {
        background: none;
        border: none;
        color: #F0F6FC;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
        opacity: 0.7;
      }

      .tedai-notification-close:hover {
        background: #30363D;
        opacity: 1;
      }

      .tedai-notification-body {
        padding: 16px;
        font-size: 14px;
        line-height: 1.5;
        opacity: 0.95;
      }

      .tedai-notification-body strong {
        font-weight: 600;
      }

      .tedai-notification-actions {
        display: flex;
        gap: 8px;
        padding: 12px 16px 16px 16px;
      }

      .tedai-notification-btn {
        flex: 1;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .tedai-notification-btn-primary {
        background: #2A903B;
        color: #F0F6FC;
      }

      .tedai-notification-btn-primary:hover {
        background: #3FB950;
        transform: translateY(-1px);
      }

      .tedai-notification-btn-secondary {
        background: #DA3633;
        color: #F0F6FC;
      }

      .tedai-notification-btn-secondary:hover {
        background: #F85149;
      }

      /* Swipeable container */
      .tedai-notification-swipeable {
        position: relative;
        overflow: hidden;
        border-radius: inherit;
      }

      /* Queue item actions (small buttons) */
      .tedai-queue-item-actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
        justify-content: flex-end;
      }

      .tedai-queue-action-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tedai-queue-approve-btn {
        background: #2A903B;
        color: #F0F6FC;
      }

      .tedai-queue-approve-btn:hover {
        background: #3FB950;
        transform: scale(1.1);
      }

      .tedai-queue-reject-btn {
        background: #DA3633;
        color: #F0F6FC;
      }

      .tedai-queue-reject-btn:hover {
        background: #F85149;
        transform: scale(1.1);
      }

      /* Swipe overlay styles (injected by SwipeGestureHandler) */
      .swipe-overlay {
        z-index: 1;
      }

      .swipe-label {
        z-index: 2;
      }
    `;
    document.head.appendChild(style);
  }

  // Create button element
  const button = document.createElement('div');
  button.id = 'tedai-sticky-button';
  button.className = 'tedai-sticky-button small';
  
  // Small button content (icon + badge)
  const icon = document.createElement('div');
  icon.className = 'tedai-button-icon';
  icon.innerHTML = '✓';
  button.appendChild(icon);

  const badge = document.createElement('div');
  badge.className = 'tedai-badge';
  badge.textContent = '0';
  button.appendChild(badge);

  // Notification content (hidden by default)
  const notificationContent = document.createElement('div');
  notificationContent.className = 'tedai-notification-content';
  button.appendChild(notificationContent);

  // Queue content (hidden by default)
  const queueContent = document.createElement('div');
  queueContent.className = 'tedai-queue-content';
  button.appendChild(queueContent);

  // Click handler for small button state
  button.addEventListener('click', (e) => {
    if (currentState === 'small') {
      showQueueView();
    } else if (currentState === 'queue') {
      collapseToButton(currentTaskCount);
    }
  });

  document.body.appendChild(button);
  stickyButton = button;
  return button;
}

// Show notification in expanded state
function showNotification(taskData) {
  console.log('[StickyButton] Showing notification for task:', taskData.type);
  
  const button = createStickyButton();
  currentNotificationTaskId = taskData.id;
  
  // Build task summary
  let taskSummary = '';
  switch (taskData.type) {
    case 'email':
      taskSummary = `To: ${taskData.data.to}<br><strong>${taskData.data.subject}</strong>`;
      break;
    case 'calendar':
      const startDate = new Date(taskData.data.startTime);
      const timeStr = startDate.toLocaleDateString() + ' ' + startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      taskSummary = `<strong>${taskData.data.title}</strong><br>${timeStr}`;
      break;
    case 'reminder':
      taskSummary = `<strong>${taskData.data.title}</strong>`;
      break;
    default:
      taskSummary = 'New task available';
  }

  // Update notification content
  const notificationContent = button.querySelector('.tedai-notification-content');
  notificationContent.innerHTML = `
    <div class="tedai-notification-swipeable">
      <div class="tedai-notification-header">
        <div class="tedai-notification-icon">!</div>
        <div class="tedai-notification-title">New ${taskData.type} task</div>
        <button class="tedai-notification-close">×</button>
      </div>
      <div class="tedai-notification-body">
        ${taskSummary}
      </div>
      <div class="tedai-notification-actions">
        <button class="tedai-notification-btn tedai-notification-btn-primary tedai-approve-btn">✓ Approve</button>
        <button class="tedai-notification-btn tedai-notification-btn-secondary tedai-reject-btn">✗ Reject</button>
      </div>
    </div>
  `;

  // Switch to notification state
  button.className = 'tedai-sticky-button notification';
  currentState = 'notification';

  // Get the swipeable element
  const swipeableElement = notificationContent.querySelector('.tedai-notification-swipeable');

  // Clean up previous swipe handler
  if (currentSwipeHandler) {
    currentSwipeHandler.destroy();
    currentSwipeHandler = null;
  }

  // Initialize swipe gesture handler
  if (typeof SwipeGestureHandler !== 'undefined') {
    try {
      currentSwipeHandler = new SwipeGestureHandler(swipeableElement, {
        threshold: 0.35,
        minDistance: 80,
        onSwipeRight: () => {
          approveTask(taskData.id);
        },
        onSwipeLeft: () => {
          rejectTask(taskData.id);
        }
      });
    } catch (error) {
      console.error('[StickyButton] Failed to initialize swipe gestures:', error);
    }
  } else {
    console.warn('[StickyButton] SwipeGestureHandler not available - swipe gestures disabled');
  }

  // Add event listeners to buttons (fallback)
  notificationContent.querySelector('.tedai-notification-close').addEventListener('click', (e) => {
    e.stopPropagation();
    requestTaskCountAndCollapse();
  });

  notificationContent.querySelector('.tedai-approve-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    approveTask(taskData.id);
  });

  notificationContent.querySelector('.tedai-reject-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    rejectTask(taskData.id);
  });

  // Auto-collapse after 10 seconds (increased from 8 for swipe interaction)
  clearAutoCollapseTimeout();
  autoCollapseTimeout = setTimeout(() => {
    requestTaskCountAndCollapse();
  }, 10000);
}

// Collapse to small button with badge count
function collapseToButton(taskCount) {
  console.log('[StickyButton] Collapsing to button, task count:', taskCount);
  
  if (!stickyButton) {
    return;
  }

  currentTaskCount = taskCount;
  
  if (taskCount === 0) {
    hideButton();
    return;
  }

  // Update badge count
  const badge = stickyButton.querySelector('.tedai-badge');
  if (badge) {
    badge.textContent = taskCount.toString();
  }

  // Switch to small state
  stickyButton.className = 'tedai-sticky-button small';
  currentState = 'small';
  
  clearAutoCollapseTimeout();
}

// Hide button completely
function hideButton() {
  console.log('[StickyButton] Hiding button');
  
  if (stickyButton) {
    stickyButton.remove();
    stickyButton = null;
  }
  
  currentState = 'hidden';
  currentTaskCount = 0;
  clearAutoCollapseTimeout();
}

// Update button state based on task count
function updateButtonState(taskCount) {
  console.log('[StickyButton] Updating button state, task count:', taskCount);
  
  currentTaskCount = taskCount;
  
  if (taskCount === 0) {
    hideButton();
  } else if (currentState === 'small') {
    // Update badge count if already in small state
    if (stickyButton) {
      const badge = stickyButton.querySelector('.tedai-badge');
      if (badge) {
        badge.textContent = taskCount.toString();
      }
    } else {
      // Create button if it doesn't exist
      createStickyButton();
      collapseToButton(taskCount);
    }
  } else if (currentState === 'hidden') {
    // Show button in small state
    createStickyButton();
    collapseToButton(taskCount);
  }
  // If notification or queue, don't change state (let it auto-collapse or user dismiss)
}

// Show queue view with all pending tasks
function showQueueView() {
  console.log('[StickyButton] Showing queue view');
  
  const button = createStickyButton();
  
  // Request pending tasks from background
  safeSendMessage({ type: 'GET_PENDING_TASKS' }, (response) => {
    if (response && response.success) {
      renderQueueView(response.tasks);
    }
  });
}

// Render the queue view with tasks
function renderQueueView(tasks) {
  console.log('[StickyButton] Rendering queue view with', tasks.length, 'tasks');
  
  if (!stickyButton) {
    return;
  }
  
  const queueContent = stickyButton.querySelector('.tedai-queue-content');
  
  // Build queue header
  let queueHTML = `
    <div class="tedai-queue-header">
      <div class="tedai-queue-title">Task Queue (${tasks.length})</div>
      <button class="tedai-queue-close">×</button>
    </div>
  `;
  
  // Build queue list
  if (tasks.length === 0) {
    queueHTML += `
      <div class="tedai-queue-empty">
        <div class="tedai-queue-empty-icon">✓</div>
        <div class="tedai-queue-empty-text">All caught up!</div>
      </div>
    `;
  } else {
    queueHTML += '<div class="tedai-queue-list">';
    tasks.forEach(task => {
      const timeAgo = getTimeAgo(new Date(task.createdAt));
      const summary = getTaskSummary(task);
      
      queueHTML += `
        <div class="tedai-queue-item" data-task-id="${task.id}">
          <div class="tedai-queue-item-header">
            <span class="tedai-queue-item-type">${task.type}</span>
            <span class="tedai-queue-item-time">${timeAgo}</span>
          </div>
          <div class="tedai-queue-item-summary">${summary}</div>
          <div class="tedai-queue-item-actions">
            <button class="tedai-queue-action-btn tedai-queue-approve-btn" data-task-id="${task.id}">✓</button>
            <button class="tedai-queue-action-btn tedai-queue-reject-btn" data-task-id="${task.id}">✗</button>
          </div>
        </div>
      `;
    });
    queueHTML += '</div>';
  }
  
  // Build queue footer
  queueHTML += `
    <div class="tedai-queue-footer">
      <button class="tedai-queue-footer-btn">Open Full Queue</button>
    </div>
  `;
  
  queueContent.innerHTML = queueHTML;
  
  // Switch to queue state
  stickyButton.className = 'tedai-sticky-button queue';
  currentState = 'queue';
  
  // Add event listeners
  queueContent.querySelector('.tedai-queue-close').addEventListener('click', (e) => {
    e.stopPropagation();
    collapseToButton(currentTaskCount);
  });
  
  queueContent.querySelector('.tedai-queue-footer-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openPopup();
  });
  
  // Initialize swipe gestures for each queue item
  if (typeof SwipeGestureHandler !== 'undefined' && tasks.length > 0) {
    const queueItems = queueContent.querySelectorAll('.tedai-queue-item');
    queueItems.forEach(item => {
      const taskId = item.dataset.taskId;
      try {
        new SwipeGestureHandler(item, {
          threshold: 0.35,
          minDistance: 80,
          onSwipeRight: () => {
            approveTask(taskId);
          },
          onSwipeLeft: () => {
            rejectTask(taskId);
          }
        });
      } catch (error) {
        console.error('[StickyButton] Failed to initialize swipe for item:', taskId, error);
      }
    });

    // Add button click handlers as fallback
    queueContent.querySelectorAll('.tedai-queue-approve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = e.target.dataset.taskId;
        approveTask(taskId);
      });
    });

    queueContent.querySelectorAll('.tedai-queue-reject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = e.target.dataset.taskId;
        rejectTask(taskId);
      });
    });
  }
  
  clearAutoCollapseTimeout();
}

// Helper function to get task summary for queue items
function getTaskSummary(task) {
  switch (task.type) {
    case 'email':
      return `<strong>${task.data.subject}</strong><br>To: ${task.data.to}`;
    case 'calendar':
      const startDate = new Date(task.data.startTime);
      const timeStr = startDate.toLocaleDateString() + ' ' + startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const locationStr = task.data.location ? `<br>@ ${task.data.location}` : '';
      return `<strong>${task.data.title}</strong><br>${timeStr}${locationStr}`;
    case 'reminder':
      return `<strong>${task.data.title}</strong>`;
    default:
      return 'Task details unavailable';
  }
}

// Helper function to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Request current task count from background and collapse
function requestTaskCountAndCollapse() {
  console.log('[StickyButton] Requesting task count from background');
  
  safeSendMessage({ type: 'GET_PENDING_TASK_COUNT' }, (response) => {
    if (response && response.success) {
      collapseToButton(response.count);
    } else {
      // Fallback: collapse to button with current count
      collapseToButton(currentTaskCount);
    }
  });
}

// Open extension popup
function openPopup() {
  console.log('[StickyButton] Opening popup');
  safeSendMessage({ type: 'OPEN_POPUP' });
}

// Clear auto-collapse timeout
function clearAutoCollapseTimeout() {
  if (autoCollapseTimeout) {
    clearTimeout(autoCollapseTimeout);
    autoCollapseTimeout = null;
  }
}

// Approve task
function approveTask(taskId) {
  // Send message to background script
  const sent = safeSendMessage({ 
    type: 'APPROVE_TASK', 
    taskId: taskId 
  }, (response) => {
    if (response && response.success) {
      // Refresh the view after a short delay to allow animation
      setTimeout(() => {
        if (currentState === 'notification') {
          requestTaskCountAndCollapse();
        } else if (currentState === 'queue') {
          showQueueView(); // Refresh queue view
        }
      }, 350);
    } else {
      console.error('[StickyButton] Failed to approve task:', response);
    }
  });
  
  if (!sent) {
    console.error('[StickyButton] Failed to send approve message - extension context may be invalid');
  }
}

// Reject task
function rejectTask(taskId) {
  // Send message to background script
  const sent = safeSendMessage({ 
    type: 'REJECT_TASK', 
    taskId: taskId 
  }, (response) => {
    if (response && response.success) {
      // Refresh the view after a short delay to allow animation
      setTimeout(() => {
        if (currentState === 'notification') {
          requestTaskCountAndCollapse();
        } else if (currentState === 'queue') {
          showQueueView(); // Refresh queue view
        }
      }, 350);
    } else {
      console.error('[StickyButton] Failed to reject task:', response);
    }
  });
  
  if (!sent) {
    console.error('[StickyButton] Failed to send reject message - extension context may be invalid');
  }
}

// Helper function to safely send messages to background script
function safeSendMessage(message, callback) {
  try {
    // Check if chrome.runtime is still available
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('[StickyButton] Extension context invalidated, skipping message');
      return false;
    }
    
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[StickyButton] Runtime error:', chrome.runtime.lastError.message);
        if (callback) callback(null);
        return;
      }
      if (callback) callback(response);
    });
    return true;
  } catch (error) {
    console.log('[StickyButton] Error sending message:', error.message);
    return false;
  }
}

// Request initial state on load
safeSendMessage({ type: 'GET_PENDING_TASK_COUNT' }, (response) => {
  if (response && response.success && response.count > 0) {
    createStickyButton();
    collapseToButton(response.count);
  }
});

console.log('[StickyButton] Content script loaded');
