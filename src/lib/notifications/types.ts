// Customer notification bell (in-app inbox) types. Mirror
// src/customer_notifications/models.py on the backend.

export interface NotificationItem {
  ids: number[];
  event_type: string;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  read: boolean;
  count: number;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread_count: number;
  granularity: string;
}
