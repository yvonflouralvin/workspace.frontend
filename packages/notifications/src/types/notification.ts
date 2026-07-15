export interface InAppNotification {
  id: number;
  type_key: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  items: InAppNotification[];
  unread_count: number;
}
