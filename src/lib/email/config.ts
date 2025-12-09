export const EMAIL_CONFIG = {
  QUEUE_API_URL: process.env.QUEUE_TASK_API_URL,
  DEFAULT_PROVIDER: 'smtp' as const,
  TASK_NAME: 'send_email_direct_task' as const,
  HANDLER_KEY: 'alan_tasks' as const,
};
