// Gmail URL Builder Utility

import { EmailTask } from '../../../shared/types/index';

export class GmailUtils {
  /**
   * Build Gmail compose URL with pre-filled parameters
   */
  static buildComposeUrl(emailTask: EmailTask): string {
    const baseUrl = 'https://mail.google.com/mail/?view=cm';
    const params = new URLSearchParams();

    // Required fields
    params.append('to', emailTask.to);
    params.append('su', emailTask.subject);
    params.append('body', emailTask.body);

    // Optional fields
    if (emailTask.cc) {
      params.append('cc', emailTask.cc);
    }
    if (emailTask.bcc) {
      params.append('bcc', emailTask.bcc);
    }

    return `${baseUrl}&${params.toString()}`;
  }

  /**
   * Open Gmail compose window with email task data
   */
  static async openComposeWindow(emailTask: EmailTask): Promise<void> {
    const url = this.buildComposeUrl(emailTask);
    
    try {
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Failed to open Gmail compose window:', error);
      throw new Error('Unable to open Gmail compose window');
    }
  }

  /**
   * Validate email task data
   */
  static validateEmailTask(emailTask: EmailTask): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!emailTask.to || emailTask.to.trim() === '') {
      errors.push('Recipient email is required');
    } else if (!this.isValidEmail(emailTask.to)) {
      errors.push('Invalid recipient email format');
    }

    if (!emailTask.subject || emailTask.subject.trim() === '') {
      errors.push('Subject is required');
    }

    if (!emailTask.body || emailTask.body.trim() === '') {
      errors.push('Email body is required');
    }

    if (emailTask.cc && !this.isValidEmail(emailTask.cc)) {
      errors.push('Invalid CC email format');
    }

    if (emailTask.bcc && !this.isValidEmail(emailTask.bcc)) {
      errors.push('Invalid BCC email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Basic email validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Format email task for display
   */
  static formatEmailSummary(emailTask: EmailTask): string {
    const to = emailTask.to;
    const subject = emailTask.subject.length > 50 
      ? emailTask.subject.substring(0, 50) + '...' 
      : emailTask.subject;
    
    return `To: ${to} - ${subject}`;
  }
}
