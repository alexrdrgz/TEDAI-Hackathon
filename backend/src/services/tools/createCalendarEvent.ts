import { Tool } from './index';
import { db } from '../db';

export const createCalendarEventTool: Tool = {
  name: 'create_calendar_event',
  description: 'Create a calendar event for the user to review and confirm. Use this when the user needs to schedule a meeting, set a reminder, or manage calendar events.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The event title'
      },
      description: {
        type: 'string',
        description: 'A detailed description of the event'
      },
      startTime: {
        type: 'string',
        description: 'The event start time in ISO 8601 format (e.g., "2024-01-15T14:00:00.000Z")'
      },
      endTime: {
        type: 'string',
        description: 'The event end time in ISO 8601 format (e.g., "2024-01-15T15:00:00.000Z")'
      },
      attendees: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of attendee email addresses'
      },
      location: {
        type: 'string',
        description: 'Optional event location'
      },
      reminder: {
        type: 'number',
        description: 'Optional reminder time in minutes before the event (default: 15)'
      }
    },
    required: ['title', 'description', 'startTime', 'endTime', 'attendees']
  },
  execute: async (input: Record<string, any>): Promise<string> => {
    const { title, description, startTime, endTime, attendees, location, reminder } = input;

    if (!title || !description || !startTime || !endTime || !attendees) {
      return 'Error: Missing required fields (title, description, startTime, endTime, attendees)';
    }

    try {
      const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const taskData = JSON.stringify({
        title,
        description,
        startTime,
        endTime,
        attendees,
        location: location || '',
        reminder: reminder || 15
      });

      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO tasks (id, type, data, status) VALUES (?, ?, ?, ?)`,
          [taskId, 'calendar', taskData, 'pending'],
          (err: Error | null) => {
            if (err) {
              console.error('[create_calendar_event] Failed to create calendar task:', err);
              reject(new Error(`Failed to create calendar event: ${err.message}`));
              return;
            }

            console.log(`[create_calendar_event] Created calendar event ${taskId}: "${title}"`);
            const attendeeList = Array.isArray(attendees) ? attendees.join(', ') : attendees;
            resolve(`Calendar event created successfully. "${title}" scheduled from ${startTime} to ${endTime} with attendees: ${attendeeList}. The event is ready for review.`);
          }
        );
      });
    } catch (error: any) {
      console.error('[create_calendar_event] Error:', error);
      return `Error: ${error.message}`;
    }
  }
};

