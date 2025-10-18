// Shared TypeScript Types for TEDAI Task Queue System

export enum TaskType {
  EMAIL = 'email',
  CALENDAR = 'calendar',
  REMINDER = 'reminder',
  OTHER = 'other'
}

export enum TaskStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SNOOZED = 'snoozed'
}

export interface EmailTask {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export interface CalendarTask {
  title: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  attendees?: string[];
  location?: string;
  reminder?: number; // minutes before event
}

export interface ReminderTask {
  title: string;
  description?: string;
  remindAt: Date;
}

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  createdAt: Date;
  snoozedUntil?: Date;
  data: EmailTask | CalendarTask | ReminderTask;
}

export interface TaskUpdate {
  status?: TaskStatus;
  snoozedUntil?: Date;
  data?: Partial<EmailTask | CalendarTask | ReminderTask>;
}
