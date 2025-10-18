// TEDAI Task Queue Manager Popup Logic

console.log('Popup script loaded successfully!');

class TaskQueueManager {
    constructor() {
        this.tasks = [];
        this.editingTaskId = null;
        this.snoozingTaskId = null;
        this.init();
    }

    async init() {
        console.log('Initializing TaskQueueManager...');
        await this.loadTasks();
        this.setupEventListeners();
        this.render();
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

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Test button
        const testButton = document.getElementById('addTestTask');
        if (testButton) {
            testButton.addEventListener('click', () => {
                console.log('Test button clicked!');
                this.addTestEmailTask();
            });
        } else {
            console.error('Test button not found!');
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
        const testTask = {
            type: 'email',
            data: {
                to: 'test@example.com',
                subject: 'Test Email from TEDAI',
                body: 'This is a test email created by the TEDAI AI Agent. Please review and approve if you want to send it.'
            }
        };

        console.log('Adding test task:', testTask);

        try {
            const response = await this.sendMessageToBackground({ 
                type: 'ADD_TASK', 
                task: testTask 
            });
            console.log('Add task response:', response);
            
            await this.loadTasks();
            this.render();
        } catch (error) {
            console.error('Failed to add test task:', error);
        }
    }

    async approveTask(taskId) {
        console.log('Approving task:', taskId);
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.type === 'email') {
            await this.openGmailCompose(task.data);
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
                return `Event: ${task.data.title}`;
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