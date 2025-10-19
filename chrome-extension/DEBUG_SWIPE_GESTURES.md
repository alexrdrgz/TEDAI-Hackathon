# Debugging Swipe Gestures Not Working

## Quick Test Steps

### Step 1: Reload Extension
1. Go to `chrome://extensions/`
2. Find "TEDAI Proactive AI Agent"
3. Click the refresh icon 🔄

### Step 2: Refresh Web Page
- Go to the page where you want notifications
- Press **Cmd+R** (Mac) or **Ctrl+R** (Windows)

### Step 3: Open DevTools
- Press **F12** or **Cmd+Option+I** (Mac)
- Go to **Console** tab
- Keep this open while testing

### Step 4: Check Logs on Page Load
Look for these messages immediately in console:
```
[StickyButton] Content script loaded
[StickyButton] SwipeGestureHandler available: true
```

**If you see `false` instead of `true`:**
- The SwipeGestureHandler script didn't load
- Check manifest.json has correct file paths
- Reload extension and try again

### Step 5: Generate a Test Task
1. Click extension icon in toolbar
2. Click "Add Test Email Task"
3. Wait 2-3 seconds

### Step 6: Check Notification Logs
When notification appears, you should see:
```
[StickyButton] Showing notification for task: email
[StickyButton] Initializing swipe gestures for notification
[StickyButton] Swipe gestures initialized successfully
```

**If you see warning instead:**
```
[StickyButton] SwipeGestureHandler not available - swipe gestures disabled
```
→ This means SwipeGestureHandler class is not loaded

### Step 7: Test Swipe Gesture
Try swiping right on the notification card.

**Expected logs:**
```
[StickyButton] Swipe right - Approving task: task_xxxxx
[StickyButton] ✓ Approving task: task_xxxxx
[StickyButton] Current state: notification
[StickyButton] Approve response received: {success: true}
[StickyButton] ✓ Task approved successfully, opening Gmail/Calendar...
[StickyButton] Collapsing notification
```

**If no logs appear when swiping:**
- Swipe gesture not being detected
- Try clicking the "✓ Approve" button instead to test if that works
- If button works but swipe doesn't, it's a gesture detection issue

### Step 8: Test Button (Fallback)
Click the "✓ Approve" button.

**Expected logs:** Same as swipe test above

**If button doesn't work either:**
- Task ID mismatch issue
- Extension context invalidated
- Background script not responding

---

## Common Issues & Fixes

### Issue: SwipeGestureHandler Available: false

**Cause:** The swipeGestures.js file isn't loading

**Fix:**
1. Check `chrome-extension/manifest.json`:
   ```json
   "content_scripts": [{
     "matches": ["<all_urls>"],
     "js": ["src/utils/swipeGestures.js", "toast-notification.js"]
   }]
   ```
   Order matters! swipeGestures.js must come first

2. Check file exists:
   ```bash
   ls chrome-extension/src/utils/swipeGestures.js
   ```

3. Reload extension and refresh page

### Issue: Gesture Detection Not Working

**Symptoms:** No logs when swiping, but button works

**Test in console:**
```javascript
// Check if class is available
typeof SwipeGestureHandler
// Should return: "function"

// Test creating an instance
const testEl = document.createElement('div');
testEl.style.width = '200px';
testEl.style.height = '100px';
document.body.appendChild(testEl);
new SwipeGestureHandler(testEl, {
  onSwipeRight: () => console.log('RIGHT!'),
  onSwipeLeft: () => console.log('LEFT!')
});
```

Try swiping the test element. If this works, the issue is with the notification element.

### Issue: Approve Fails with "Task not found"

**Cause:** Task ID mismatch between notification and storage

**Fix:**
1. Clear storage:
   ```javascript
   // In chrome://extensions/ -> service worker console:
   chrome.storage.local.clear()
   ```

2. Reload extension
3. Generate new test task

### Issue: Extension Context Invalidated

**Symptoms:** Error messages about "Extension context invalidated"

**Fix:**
1. Close the web page tab
2. Reload the extension
3. Open a fresh tab
4. Test again

### Issue: Neither Button Nor Swipe Works

**Check background script:**
1. Go to `chrome://extensions/`
2. Click "Inspect views: service worker" for TEDAI
3. Look for error messages in console
4. Try this test:
   ```javascript
   // Check if tasks exist
   chrome.storage.local.get('tedai_task_queue', (result) => {
     console.log('Tasks:', result.tedai_task_queue);
   });
   ```

---

## Manual Testing Script

Run this in the page console to manually test everything:

```javascript
// 1. Check if SwipeGestureHandler loaded
console.log('SwipeGestureHandler:', typeof SwipeGestureHandler);

// 2. Check if content script functions exist
console.log('approveTask:', typeof approveTask);
console.log('rejectTask:', typeof rejectTask);

// 3. Test sending approve message manually
chrome.runtime.sendMessage({
  type: 'APPROVE_TASK',
  taskId: 'test_123'
}, (response) => {
  console.log('Manual approve test:', response);
});

// 4. Check current state
console.log('Current state:', currentState);
console.log('Task count:', currentTaskCount);
```

---

## Background Script Debugging

Open background service worker console:
1. `chrome://extensions/`
2. "Inspect views: service worker"

Run these tests:

```javascript
// Check if task exists
getTasks().then(tasks => {
  console.log('All tasks:', tasks);
  console.log('Pending tasks:', tasks.filter(t => t.status === 'pending'));
});

// Test approve function directly
getTasks().then(async tasks => {
  if (tasks.length > 0) {
    const task = tasks[0];
    console.log('Testing approve for:', task.id);
    await executeTaskAction(task);
    console.log('Task action executed!');
  }
});
```

---

## Expected Full Flow

When everything works correctly:

**1. Page Load:**
```
[StickyButton] Content script loaded
[StickyButton] SwipeGestureHandler available: true
```

**2. Task Created:**
```
[Background] Task added to queue: task_xxxxx
[Polling] Sending toast to active tab: 123
[StickyButton] Received message: SHOW_TOAST
[StickyButton] Showing notification for task: email
```

**3. Gesture Initialization:**
```
[StickyButton] Initializing swipe gestures for notification
[StickyButton] Swipe gestures initialized successfully
```

**4. User Swipes Right:**
```
[StickyButton] Swipe right - Approving task: task_xxxxx
[StickyButton] ✓ Approving task: task_xxxxx
[StickyButton] Current state: notification
```

**5. Background Processes:**
```
[Background] Approving task: task_xxxxx
[executeTaskAction] Executing action for task: email task_xxxxx
[openGmailCompose] Opening Gmail compose: ...
[openGmailCompose] Gmail compose window opened
```

**6. UI Updates:**
```
[StickyButton] Approve response received: {success: true}
[StickyButton] ✓ Task approved successfully, opening Gmail/Calendar...
[StickyButton] Collapsing notification
```

**7. Gmail Opens:**
- New tab opens with Gmail compose
- Email fields pre-filled
- Task removed from queue

---

## Still Not Working?

If you've tried everything and it still doesn't work:

1. **Capture full logs:**
   - Open DevTools on web page
   - Open service worker console
   - Perform the action
   - Copy ALL console output

2. **Check for errors:**
   - Any red error messages?
   - Any warnings?

3. **Verify files exist:**
   ```bash
   ls chrome-extension/src/utils/swipeGestures.js
   ls chrome-extension/toast-notification.js
   ls chrome-extension/background.js
   ls chrome-extension/manifest.json
   ```

4. **Check manifest.json structure:**
   - Is content_scripts array correct?
   - Are file paths correct?
   - Is there a syntax error in JSON?

**Share the console output for debugging!**

