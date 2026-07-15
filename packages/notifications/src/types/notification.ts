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

// ─── Configuration (Paramètres) ──────────────────────────────────────────────

export interface NotificationConfigType {
  type_key: string;
  app_key: string;
  label: string;
  description: string | null;
  available_channels: string[];
  enabled: boolean;
  channels: string[];
  recipient_group_ids: number[];
  recipient_permissions: string[];
}

export interface NotificationConfigList {
  items: NotificationConfigType[];
}

export interface RuleUpdate {
  enabled?: boolean;
  channels?: string[];
  recipient_group_ids?: number[];
  recipient_permissions?: string[];
}

export interface WorkspaceGroup {
  id: number;
  name: string;
}

export interface PermissionOption {
  key: string;
  label: string;
}
