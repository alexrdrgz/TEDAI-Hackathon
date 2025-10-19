import { Tool } from './index';
import { createTask } from '../db';

function generateTaskId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export const sendEmailTool: Tool = {
  name: 'send_email',
  description: 'Send an email by opening Gmail compose window with pre-filled details. IMPORTANT: Only use this tool AFTER the user has explicitly confirmed they want to send the email (e.g., "yes", "send it", "looks good", "go ahead"). Always present the final email details and ask for confirmation before calling this tool.',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Email recipient address (required)'
      },
      subject: {
        type: 'string',
        description: 'Email subject line (required)'
      },
      body: {
        type: 'string',
        description: 'Email body content (required)'
      },
      cc: {
        type: 'string',
        description: 'CC recipients, comma-separated (optional)'
      },
      bcc: {
        type: 'string',
        description: 'BCC recipients, comma-separated (optional)'
      }
    },
    required: ['to', 'subject', 'body']
  },
  execute: async (input: Record<string, any>): Promise<string> => {
    const { to, subject, body, cc, bcc } = input;

    try {
      // Validate required fields
      if (!to || !subject || !body) {
        return 'Error: Missing required fields. Please provide to, subject, and body.';
      }

      // Format email data
      const emailData = {
        to,
        subject,
        body,
        ...(cc && { cc }),
        ...(bcc && { bcc })
      };

      console.log('[sendEmail] Creating email task:', { to, subject });

      // Create task in database for Chrome extension to pick up
      const taskId = generateTaskId();
      await createTask(taskId, 'email', emailData);

      // Return confirmation message
      const message = [
        '✓ Email prepared and ready to send:',
        `To: ${to}`,
        `Subject: ${subject}`,
        cc ? `CC: ${cc}` : null,
        bcc ? `BCC: ${bcc}` : null,
        '',
        'The email compose window will open in Gmail where you can review and send the email.'
      ].filter(Boolean).join('\n');

      return message;
    } catch (error: any) {
      console.error('[sendEmail] Error:', error);
      return `Error preparing email: ${error.message}`;
    }
  }
};

