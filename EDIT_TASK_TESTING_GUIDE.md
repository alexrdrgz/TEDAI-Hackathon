# Edit Task Feature - Testing Guide

## Quick Start

### Prerequisites
1. Backend running on `http://localhost:3030`
2. Frontend running on `http://localhost:3000`
3. Chrome extension loaded and active

### Step-by-Step Test

#### Test 1: Edit Email Task

1. **Generate a test email task:**
   - Open browser console on any tab
   - Run: `chrome.runtime.sendMessage({type: 'ADD_TEST_EMAIL_TASK'})`
   - Wait for toast notification to appear

2. **Click Edit button:**
   - Click the green "✎ Edit" button on the toast
   - A new window should open with the chat interface
   - Blue banner at top should say "Editing email task"

3. **Verify task loaded:**
   - First message should show the email details (To, Subject, Body)
   - AI should respond acknowledging the task

4. **Make an edit:**
   - Type: "Change the subject to 'Updated Meeting Agenda'"
   - AI should acknowledge and ask if you want to send

5. **Confirm sending:**
   - Type: "Yes, send it"
   - AI should call the send_email tool
   - Response should include "✓ Email prepared"

6. **Verify completion:**
   - Success toast should appear
   - Gmail compose window should open
   - Original task should be removed from queue
   - Blue "Editing" banner should disappear

#### Test 2: Edit Calendar Task

1. **Generate a test calendar task:**
   - Browser console: `chrome.runtime.sendMessage({type: 'ADD_TEST_CALENDAR_TASK'})`

2. **Click Edit button on toast**

3. **Make edits:**
   - "Move the meeting to tomorrow at 3pm"
   - "Add location: Conference Room A"
   - "Add john@example.com as an attendee"

4. **Confirm:**
   - "Create the event"
   - AI calls create_calendar_event tool
   - Google Calendar window opens with updated event

#### Test 3: Edit from Queue View

1. **Generate multiple tasks:**
   ```javascript
   chrome.runtime.sendMessage({type: 'ADD_TEST_EMAIL_TASK'})
   chrome.runtime.sendMessage({type: 'ADD_TEST_CALENDAR_TASK'})
   ```

2. **Open queue:**
   - Click the badge button (shows task count)
   - Queue view should show both tasks

3. **Click Edit (✎) on any task:**
   - Chat window opens for that specific task
   - Verify correct task details are loaded

## Expected Behavior

### What Should Happen:
- ✅ Edit button appears on all toast notifications
- ✅ Edit button appears on all queue items
- ✅ Clicking Edit opens chat in new window (1000x800)
- ✅ Chat automatically loads task details
- ✅ Blue "Editing" indicator appears at top
- ✅ User can converse naturally to make edits
- ✅ AI uses send_email or create_calendar_event tools
- ✅ Gmail/Calendar window opens automatically
- ✅ Original task is deleted
- ✅ Success notification appears

### What Should NOT Happen:
- ❌ Edit button shouldn't affect Approve/Reject functionality
- ❌ Multiple chat windows shouldn't open
- ❌ Original task shouldn't remain after completion
- ❌ Chat shouldn't show task details twice

## Troubleshooting

### Issue: Chat window doesn't open
- Check frontend is running on port 3000
- Check browser console for errors
- Verify background.js received EDIT_TASK message

### Issue: Task details don't load
- Check backend is running on port 3030
- Check network tab for API call to `/api/tasks/:id`
- Verify task exists in database

### Issue: AI doesn't call tools
- Check AI response for errors
- Try being more explicit: "Use the send_email tool"
- Check backend logs for tool execution

### Issue: Gmail/Calendar doesn't open
- Check Chrome extension console
- Verify task was created in database
- Check extension is polling for tasks

### Issue: Original task not deleted
- Check frontend console for deleteTask API call
- Verify response contains "✓ Email prepared" or "✓ Calendar event prepared"
- Check backend `/api/tasks/:id` DELETE endpoint

## API Endpoints for Manual Testing

### Get Task
```bash
curl http://localhost:3030/api/tasks/TASK_ID
```

### Update Task
```bash
curl -X PUT http://localhost:3030/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"type":"email","data":{"to":"test@example.com","subject":"Test","body":"Hello"}}'
```

### Delete Task
```bash
curl -X DELETE http://localhost:3030/api/tasks/TASK_ID
```

## Chrome Extension Console Commands

### Manually trigger edit
```javascript
chrome.runtime.sendMessage({
  type: 'EDIT_TASK',
  taskId: 'task_xxx',
  taskData: {
    type: 'email',
    data: {
      to: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test'
    }
  }
})
```

### Check current tasks
```javascript
chrome.runtime.sendMessage({type: 'GET_TASKS'}, (response) => {
  console.log('Current tasks:', response.tasks)
})
```

## Success Criteria

✅ All 10 TODOs completed
✅ No linter errors
✅ Edit button appears and works on toast notifications
✅ Edit button appears and works in queue view
✅ Chat window opens with correct URL parameters
✅ Task details auto-load in chat
✅ AI can use send_email and create_calendar_event tools
✅ Gmail/Calendar opens with task data
✅ Original task is deleted automatically
✅ User receives confirmation feedback

## Next Steps

After testing, you can:
1. Adjust button colors/styling in toast-notification.js
2. Customize chat window size in background.js (lines 267-272)
3. Modify system prompt for different AI behavior
4. Add more fields to email/calendar tools
5. Implement preview before sending (optional enhancement)

