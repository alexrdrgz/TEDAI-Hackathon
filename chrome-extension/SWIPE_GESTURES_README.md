# Swipe Gesture Controls for Task Approvals

## Overview

The Chrome extension now supports swipe gestures for approving and rejecting tasks, providing a more intuitive and mobile-friendly interaction method.

## Features Implemented

### 1. Swipe Gesture Handler (`src/utils/swipeGestures.js`)
- **Cross-platform support**: Works with both touch (mobile) and mouse (desktop) events
- **Visual feedback**: 
  - Green overlay with "✓ Approve" when swiping right
  - Red overlay with "✗ Reject" when swiping left
- **Smart threshold detection**: Requires 35% of element width or 80px minimum swipe distance
- **Smooth animations**: Uses CSS transforms and requestAnimationFrame for 60fps performance
- **Cancellation support**: Snaps back to original position if swipe is cancelled

### 2. Notification Card Swipes
- When a new task notification appears, you can now:
  - **Swipe right** to approve the task
    - **Email tasks**: Opens Gmail compose window with pre-filled recipient, subject, and body
    - **Calendar tasks**: Opens Google Calendar with pre-filled event details
    - **Reminder tasks**: Opens Google Calendar to create a reminder
  - **Swipe left** to reject the task
  - **Click buttons** as a fallback (buttons changed to "✓ Approve" and "✗ Reject")
- The entire notification card is swipeable
- After successful swipe, the card animates off-screen and the action executes automatically

### 3. Queue View Swipes
- When viewing all tasks in the queue:
  - Each task item is individually swipeable
  - **Swipe right** on any task to approve it (executes the task action)
  - **Swipe left** on any task to reject it
  - Small approve (✓) and reject (✗) buttons added as fallback
- Approved tasks automatically:
  - Open Gmail for email tasks
  - Open Google Calendar for calendar/reminder tasks
- Approved/rejected tasks are removed from the queue after animation
- Queue count updates automatically

### 4. Background Integration
- Added `APPROVE_TASK` and `REJECT_TASK` message handlers
- `APPROVE_TASK` handler:
  - Executes the task action (opens Gmail/Google Calendar)
  - Updates task status to 'approved'
  - Refreshes badge count and UI state
- `REJECT_TASK` handler:
  - Updates task status to 'rejected'
  - Refreshes badge count and UI state
- Badge count and sticky button state update automatically across all tabs
- Uses existing Gmail and Google Calendar URL schemes for task execution

## How to Test

### Setup
1. Reload the Chrome extension:
   - Go to `chrome://extensions/`
   - Find "TEDAI Proactive AI Agent"
   - Click the refresh icon

2. Ensure the backend is running and monitoring is enabled

### Testing Notification Swipes

1. Generate a test task:
   - Click the extension icon
   - Click "Add Test Email Task" or "Add Test Calendar Task"
   
2. A notification card will appear on the page (bottom-right corner)

3. Try swiping:
   - **Desktop**: Click and drag the notification left or right
   - **Mobile**: Touch and swipe left or right
   
4. Observe:
   - Green overlay appears when dragging right
   - Red overlay appears when dragging left
   - Label shows "✓ Approve" or "✗ Reject"
   - If you drag past 35% of width, release completes the action
   - If you drag less, the card snaps back to position

### Testing Queue View Swipes

1. Add multiple test tasks (2-3 tasks)

2. Click the sticky button (circular button with badge count)

3. The queue view expands showing all tasks

4. Try swiping individual task items:
   - **Desktop**: Click and drag any task item left or right
   - **Mobile**: Touch and swipe any task item
   
5. Observe:
   - Same visual feedback as notification cards
   - Each task item can be swiped independently
   - Queue refreshes after each action
   - Count updates in the header

### Fallback Button Testing

1. Test the small approve/reject buttons (✓/✗) in queue items
2. Test the "✓ Approve" and "✗ Reject" buttons in notification cards
3. Verify they work the same as swipe gestures

### Task Execution Testing

1. **Email Task Approval:**
   - Swipe right or click approve on an email task
   - A new Gmail compose tab should open automatically
   - Verify the recipient, subject, and body are pre-filled
   - The task should be removed from the queue

2. **Calendar Task Approval:**
   - Swipe right or click approve on a calendar task
   - A new Google Calendar tab should open automatically
   - Verify the event creation form is pre-filled with title, date/time, location, and description
   - Click "Save" in Google Calendar to create the event
   - The task should be removed from the queue

3. **Reminder Task Approval:**
   - Swipe right or click approve on a reminder task
   - A new Google Calendar tab should open (reminders use calendar)
   - Verify the event details are pre-filled
   - The task should be removed from the queue

## Technical Details

### Task Execution

When a task is approved, the following actions are taken:

**Email Tasks:**
```javascript
// Opens Gmail compose with URL parameters
https://mail.google.com/mail/?view=cm&to=recipient@email.com&su=Subject&body=Body
```

**Calendar/Reminder Tasks:**
```javascript
// Opens Google Calendar event creation
https://calendar.google.com/calendar/render?action=TEMPLATE&text=Title&dates=START/END&details=Description
```

Note: For swipe gestures, calendar tasks default to Google Calendar. The popup interface offers additional options like .ics file download.

### Swipe Detection Algorithm

```javascript
// Threshold: 35% of element width OR minimum 80px
threshold: 0.35
minDistance: 80

// Visual feedback appears during swipe
// Action triggers when:
swipePercent >= 0.35 AND swipeDistance >= 80px
```

### Animation Timing

- Swipe animation: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- Cancel animation: 250ms cubic-bezier(0.4, 0, 0.2, 1)
- View refresh delay: 350ms (allows animation to complete)

### Event Handling

- Touch events: `touchstart`, `touchmove`, `touchend`, `touchcancel`
- Mouse events: `mousedown`, `mousemove`, `mouseup` (on document)
- Prevents vertical scrolling when horizontal swipe is detected
- Disables text selection during swipe

## Browser Compatibility

- ✅ Chrome/Chromium (tested)
- ✅ Edge (Chromium-based)
- ✅ Brave
- ✅ Opera
- ✅ Mobile browsers (Chrome, Safari)

## Troubleshooting

### "Extension context invalidated" error
This error occurs when the extension is reloaded while pages are still open with the old content script.

**Solution**: Simply refresh the web pages where you want to use the extension
- The new implementation includes safeguards to prevent crashes
- After reloading the extension, refresh all open tabs
- The error will be logged but won't break functionality

### Swipes not working
- Ensure the extension is reloaded after updating
- **Refresh all open web pages** after reloading the extension
- Check browser console for errors
- Verify `SwipeGestureHandler` is defined in console

### Gestures interfere with scrolling
- The handler prevents vertical scrolling only when horizontal swipe is detected
- If issues persist, adjust the detection logic in `swipeGestures.js`

### Visual feedback not appearing
- Check if overlay is being created (inspect element)
- Verify CSS is loaded properly
- Check z-index conflicts with page content

### Buttons not responding
- Check if the extension context is valid (look for "Extension context invalidated" in console)
- Reload the extension and refresh the page
- Verify background script is running in `chrome://extensions/`

## Future Enhancements

Possible improvements for future versions:
- Customizable swipe thresholds in settings
- Different gestures for different actions (diagonal swipes)
- Haptic feedback on mobile devices
- Sound effects for swipe actions
- Undo action with reverse swipe

