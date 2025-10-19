import { Tool } from './index';
import { createTask } from '../db';

function generateTaskId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export const createCalendarEventTool: Tool = {
  name: 'create_calendar_event',
  description: 'Create a calendar event for the user to review and confirm. Use this when the user needs to schedule a meeting, set a reminder, or manage calendar events.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Event title/name (required)'
      },
      startTime: {
        type: 'string',
        description: 'Event start time in ISO 8601 format, e.g., "2025-10-20T14:00:00" (required)'
      },
      endTime: {
        type: 'string',
        description: 'Event end time in ISO 8601 format, e.g., "2025-10-20T15:00:00" (required)'
      },
      description: {
        type: 'string',
        description: 'Event description/notes (optional)'
      },
      location: {
        type: 'string',
        description: 'Event location (optional)'
      },
      attendees: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of attendee email addresses (optional)'
      }
    },
    required: ['title', 'startTime', 'endTime']
  },
  execute: async (input: Record<string, any>): Promise<string> => {
    const { title, startTime, endTime, description, location, attendees } = input;

    try {
      // Validate required fields
      if (!title || !startTime || !endTime) {
        return 'Error: Missing required fields. Please provide title, startTime, and endTime.';
      }

      // Validate date formats
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Error: Invalid date format. Please use ISO 8601 format (e.g., "2025-10-20T14:00:00").';
      }

      if (end <= start) {
        return 'Error: End time must be after start time.';
      }

      // Format event data
      const eventData = {
        title,
        startTime,
        endTime,
        ...(description && { description }),
        ...(location && { location }),
        ...(attendees && attendees.length > 0 && { attendees })
      };

      console.log('[createCalendarEvent] Creating calendar task:', { title, startTime, endTime });

      // Create task in database for Chrome extension to pick up
      const taskId = generateTaskId();
      await createTask(taskId, 'calendar', eventData);

      // Format dates for display
      const startDate = start.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const endDate = end.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Return confirmation message
      const message = [
        '✓ Calendar event prepared:',
        `Title: ${title}`,
        `When: ${startDate} - ${endDate}`,
        location ? `Location: ${location}` : null,
        attendees && attendees.length > 0 ? `Attendees: ${attendees.join(', ')}` : null,
        description ? `\nDescription: ${description}` : null,
        '',
        'The event creation window will open in Google Calendar where you can review and save the event.'
      ].filter(Boolean).join('\n');

      return message;
    } catch (error: any) {
      console.error('[createCalendarEvent] Error:', error);
      return `Error preparing calendar event: ${error.message}`;
    }
  }
};

