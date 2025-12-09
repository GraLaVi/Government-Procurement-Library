export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  bodyHtml: string;
}

export interface EmailPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  provider: 'smtp';
  body_html: string;
}

export interface QueueTaskRequest {
  payload: EmailPayload;
  task_name: 'send_email_direct_task';
  handler_key: 'alan_tasks';
}

export interface EmailResult {
  success: boolean;
  taskId?: string;
  error?: string;
}
