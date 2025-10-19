import { Tool } from './index';
import { db } from '../db';

export const createEmailTool: Tool = {
  name: 'create_email',
  description: 'Create a draft email for the user to review and send. Use this when the user needs to communicate with someone via email or when creating an email would be helpful based on their current activity.',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'The recipient email address'
      },
      subject: {
        type: 'string',
        description: 'The email subject line'
      },
      body: {
        type: 'string',
        description: 'The complete email body content'
      }
    },
    required: ['to', 'subject', 'body']
  },
  execute: async (input: Record<string, any>): Promise<string> => {
    const { to, subject, body } = input;

    if (!to || !subject || !body) {
      return 'Error: Missing required fields (to, subject, body)';
    }

    try {
      const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const taskData = JSON.stringify({ to, subject, body });

      return new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO tasks (id, type, data, status) VALUES (?, ?, ?, ?)`,
          [taskId, 'email', taskData, 'pending'],
          (err: Error | null) => {
            if (err) {
              console.error('[create_email] Failed to create email task:', err);
              reject(new Error(`Failed to create email task: ${err.message}`));
              return;
            }

            console.log(`[create_email] Created email task ${taskId} for ${to}`);
            resolve(`Email draft created successfully. The email to ${to} with subject "${subject}" has been prepared and is ready for review.`);
          }
        );
      });
    } catch (error: any) {
      console.error('[create_email] Error:', error);
      return `Error: ${error.message}`;
    }
  }
};

