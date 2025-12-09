import { EMAIL_CONFIG } from './config';
import { EmailOptions, EmailResult } from './types';

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { to, cc, bcc, subject, bodyHtml } = options;

  if (!EMAIL_CONFIG.QUEUE_API_URL) {
    console.error('Email service: QUEUE_TASK_API_URL environment variable is not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const payload = {
    payload: {
      to,
      cc,
      bcc,
      subject,
      provider: EMAIL_CONFIG.DEFAULT_PROVIDER,
      body_html: bodyHtml,
    },
    task_name: EMAIL_CONFIG.TASK_NAME,
    handler_key: EMAIL_CONFIG.HANDLER_KEY,
  };

  try {
    const response = await fetch(EMAIL_CONFIG.QUEUE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, taskId: data.task_id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
