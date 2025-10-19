// TEDAI Task Queue Manager Popup Logic

console.log('Popup script loaded successfully!');

class TaskQueueManager {
    constructor() {
        this.tasks = [];
        this.editingTaskId = null;
        this.snoozingTaskId = null;
        this.screenshotToggle = null;
        this.init();
    }

    async init() {
        console.log('Initializing TaskQueueManager...');
        await this.loadTasks();
        await this.initScreenshotToggle();
        this.setupEventListeners();
        this.setupMessageListener();
        this.render();
    }

    setupMessageListener() {
        // Listen for task updates from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Popup received message:', message);
            if (message.type === 'TASKS_UPDATED') {
                console.log('Tasks updated, reloading...');
                this.loadTasks().then(() => {
                    this.render();
                });
            }
        });
    }

    async loadTasks() {
        try {
            console.log('Loading tasks...');
            const response = await this.sendMessageToBackground({ type: 'GET_TASKS' });
            console.log('Get tasks response:', response);
            
            if (response && response.success) {
                this.tasks = response.tasks.filter(task => task.status === 'pending');
                console.log('Filtered pending tasks:', this.tasks);
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }

    async initScreenshotToggle() {
        console.log('Initializing screenshot toggle...');
        this.screenshotToggle = new ScreenshotToggle();
        console.log('ScreenshotToggle created:', !!this.screenshotToggle);
        await this.screenshotToggle.init();
        console.log('ScreenshotToggle initialized');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Screenshot toggle
        const screenshotToggle = document.getElementById('screenshotToggle');
        console.log('Looking for screenshotToggle element:', !!screenshotToggle);
        if (screenshotToggle) {
            console.log('Adding click listener to toggle');
            screenshotToggle.addEventListener('click', () => {
                console.log('Toggle clicked in popup.js');
                this.screenshotToggle?.toggle();
            });
        } else {
            console.error('Screenshot toggle not found!');
        }
        
        // Test buttons
        const testEmailButton = document.getElementById('addTestTask');
        if (testEmailButton) {
            testEmailButton.addEventListener('click', () => {
                console.log('Test email button clicked!');
                this.addTestEmailTask();
            });
        } else {
            console.error('Test email button not found!');
        }

        const testCalendarButton = document.getElementById('addTestCalendarTask');
        if (testCalendarButton) {
            testCalendarButton.addEventListener('click', () => {
                console.log('Test calendar button clicked!');
                this.addTestCalendarTask();
            });
        } else {
            console.error('Test calendar button not found!');
        }

        // Event delegation for task action buttons
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const taskId = button.dataset.taskId;

            console.log('Task action clicked:', action, taskId);

            switch (action) {
                case 'approve':
                    this.approveTask(taskId);
                    break;
                case 'reject':
                    this.rejectTask(taskId);
                    break;
            }
        });
    }

    async addTestEmailTask() {
        console.log('Adding test email task via background script...');
        
        try {
            // Call the background script's test email function
            console.log('Sending ADD_TEST_EMAIL_TASK message...');
            const response = await this.sendMessageToBackground({ 
                type: 'ADD_TEST_EMAIL_TASK'
            });
            console.log('Add test email task response:', response);
            
            await this.loadTasks();
            this.render();
        } catch (error) {
            console.error('Failed to add test email task:', error);
        }
    }

    async addTestCalendarTask() {
        console.log('Adding test calendar task via background script...');
        
        try {
            // Call the background script's test calendar function
            console.log('Sending ADD_TEST_CALENDAR_TASK message...');
            const response = await this.sendMessageToBackground({ 
                type: 'ADD_TEST_CALENDAR_TASK'
            });
            console.log('Add test calendar task response:', response);
            
            await this.loadTasks();
            this.render();
        } catch (error) {
            console.error('Failed to add test calendar task:', error);
        }
    }

    async approveTask(taskId) {
        console.log('Approving task:', taskId);
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.type === 'email') {
            await this.openGmailCompose(task.data);
        } else if (task.type === 'calendar') {
            await this.showCalendarOptions(task.data);
        }

        await this.updateTaskStatus(taskId, 'approved');
    }

    async rejectTask(taskId) {
        console.log('Rejecting task:', taskId);
        await this.updateTaskStatus(taskId, 'rejected');
    }

    async updateTaskStatus(taskId, status, additionalUpdates = {}) {
        try {
            console.log('Updating task status:', taskId, status);
            await this.sendMessageToBackground({
                type: 'UPDATE_TASK',
                taskId: taskId,
                updates: { status, ...additionalUpdates }
            });
            
            await this.loadTasks();
            this.render();
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    }

    async openGmailCompose(emailData) {
        console.log('Opening Gmail compose:', emailData);
        const params = new URLSearchParams();
        params.append('to', emailData.to);
        params.append('su', emailData.subject);
        params.append('body', emailData.body);
        
        if (emailData.cc) params.append('cc', emailData.cc);
        if (emailData.bcc) params.append('bcc', emailData.bcc);

        const gmailUrl = `https://mail.google.com/mail/?view=cm&${params.toString()}`;
        
        try {
            await chrome.tabs.create({ url: gmailUrl });
        } catch (error) {
            console.error('Failed to open Gmail:', error);
        }
    }

    async showCalendarOptions(calendarData) {
        console.log('Showing calendar options for:', calendarData);
        
        // Create a simple modal to choose between Google Calendar and .ics download
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            color: #333;
            text-align: center;
            max-width: 300px;
        `;
        
        modalContent.innerHTML = `
            <h3 style="margin-bottom: 15px;">Choose Calendar Option</h3>
            <p style="margin-bottom: 20px; font-size: 14px;">How would you like to create this calendar event?</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="googleCalendarBtn" style="
                    background: #4285f4;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">Google Calendar</button>
                <button id="downloadIcsBtn" style="
                    background: #34a853;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">Download .ics</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Handle Google Calendar option
        document.getElementById('googleCalendarBtn').addEventListener('click', async () => {
            await this.openGoogleCalendar(calendarData);
            document.body.removeChild(modal);
        });
        
        // Handle .ics download option
        document.getElementById('downloadIcsBtn').addEventListener('click', async () => {
            await this.downloadIcsFile(calendarData);
            document.body.removeChild(modal);
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    async openGoogleCalendar(calendarData) {
        console.log('Opening Google Calendar:', calendarData);
        
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
        } catch (error) {
            console.error('Failed to open Google Calendar:', error);
        }
    }

    async downloadIcsFile(calendarData) {
        console.log('Downloading .ics file:', calendarData);
        
        const startDate = new Date(calendarData.startTime);
        const endDate = new Date(calendarData.endTime);
        
        // Generate unique ID for the event
        const uid = `tedai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@tedai-agent`;
        
        // Format dates for iCalendar
        const formatIcsDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        // Escape special characters in iCalendar text fields
        const escapeIcsText = (text) => {
            return text
                .replace(/\\/g, '\\\\')
                .replace(/;/g, '\\;')
                .replace(/,/g, '\\,')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '');
        };
        
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//TEDAI AI Agent//Calendar Event//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTART:${formatIcsDate(startDate)}`,
            `DTEND:${formatIcsDate(endDate)}`,
            `SUMMARY:${escapeIcsText(calendarData.title)}`,
            `STATUS:CONFIRMED`,
            `TRANSP:OPAQUE`
        ];
        
        if (calendarData.description) {
            icsContent.push(`DESCRIPTION:${escapeIcsText(calendarData.description)}`);
        }
        
        if (calendarData.location) {
            icsContent.push(`LOCATION:${escapeIcsText(calendarData.location)}`);
        }
        
        if (calendarData.attendees && calendarData.attendees.length > 0) {
            calendarData.attendees.forEach(attendee => {
                icsContent.push(`ATTENDEE:MAILTO:${attendee}`);
            });
        }
        
        if (calendarData.reminder) {
            icsContent.push(
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                `TRIGGER:-PT${calendarData.reminder}M`,
                `DESCRIPTION:${escapeIcsText(calendarData.title)}`,
                'END:VALARM'
            );
        }
        
        icsContent.push('END:VEVENT');
        icsContent.push('END:VCALENDAR');
        
        const icsString = icsContent.join('\r\n');
        const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${calendarData.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
    }

    render() {
        console.log('Rendering tasks:', this.tasks);
        const loadingEl = document.getElementById('loading');
        const taskListEl = document.getElementById('taskList');
        const emptyStateEl = document.getElementById('emptyState');

        loadingEl.style.display = 'none';

        if (this.tasks.length === 0) {
            taskListEl.style.display = 'none';
            emptyStateEl.style.display = 'block';
        } else {
            emptyStateEl.style.display = 'none';
            taskListEl.style.display = 'block';
            taskListEl.innerHTML = this.tasks.map(task => this.renderTask(task)).join('');
        }
    }

    renderTask(task) {
        const timeAgo = this.getTimeAgo(new Date(task.createdAt));
        const summary = this.getTaskSummary(task);
        
        return `
            <div class="task-item" data-task-id="${task.id}">
                <div class="task-header">
                    <span class="task-type">${task.type}</span>
                    <span class="task-time">${timeAgo}</span>
                </div>
                <div class="task-summary">${summary}</div>
                <div class="task-actions">
                    <button class="btn btn-approve" data-action="approve" data-task-id="${task.id}">
                        ✓ Approve
                    </button>
                    <button class="btn btn-reject" data-action="reject" data-task-id="${task.id}">
                        ✗ Reject
                    </button>
                </div>
            </div>
        `;
    }

    getTaskSummary(task) {
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
                return 'Unknown task type';
        }
    }

    getTimeAgo(date) {
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

    sendMessageToBackground(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }
}

// Initialize the task manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing TaskQueueManager...');
    window.taskManager = new TaskQueueManager();
});