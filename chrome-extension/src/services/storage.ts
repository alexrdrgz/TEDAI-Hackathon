// Chrome Storage Service for Task Queue Management

import { Task, TaskUpdate, TaskStatus } from '../../../shared/types/index';

const STORAGE_KEY = 'tedai_task_queue';

export class TaskStorageService {
  /**
   * Add a new task to the queue
   */
  static async addTask(task: Task): Promise<void> {
    const tasks = await this.getTasks();
    tasks.push(task);
    await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
  }

  /**
   * Retrieve all tasks from storage
   */
  static async getTasks(): Promise<Task[]> {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
  }

  /**
   * Get tasks filtered by status
   */
  static async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const tasks = await this.getTasks();
    return tasks.filter(task => task.status === status);
  }

  /**
   * Get pending tasks count
   */
  static async getPendingTasksCount(): Promise<number> {
    const pendingTasks = await this.getTasksByStatus(TaskStatus.PENDING);
    return pendingTasks.length;
  }

  /**
   * Update a task by ID
   */
  static async updateTask(taskId: string, updates: TaskUpdate): Promise<void> {
    const tasks = await this.getTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Update the task
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      data: updates.data ? { ...tasks[taskIndex].data, ...updates.data } : tasks[taskIndex].data
    };

    await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
  }

  /**
   * Delete a task by ID
   */
  static async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    await chrome.storage.local.set({ [STORAGE_KEY]: filteredTasks });
  }

  /**
   * Clear all tasks
   */
  static async clearAllTasks(): Promise<void> {
    await chrome.storage.local.remove([STORAGE_KEY]);
  }

  /**
   * Get tasks that are due for snooze (snoozedUntil <= now)
   */
  static async getDueSnoozedTasks(): Promise<Task[]> {
    const tasks = await this.getTasks();
    const now = new Date();
    return tasks.filter(task => 
      task.status === TaskStatus.SNOOZED && 
      task.snoozedUntil && 
      task.snoozedUntil <= now
    );
  }
}
