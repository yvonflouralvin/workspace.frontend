export interface PermissionDef {
  id: number;
  name: string;
  description: string | null;
}

export interface AppPermissionGroup {
  id: number | null;
  key: string | null;
  name: string;
  permissions: PermissionDef[];
}

export interface GroupRef {
  id: number;
  name: string;
}

export interface Member {
  id: number;
  user: {
    id: number;
    email: string;
    username: string;
  };
  groups: GroupRef[];
  direct_permissions: GroupRef[];
  permissions: string[];
  is_owner: boolean;
  // Non encore exposés par le service auth — la colonne affiche « — » / « Actif »
  // tant qu'ils sont absents.
  is_active?: boolean;
  last_login_at?: string | null;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  is_system: boolean;
  permissions: GroupRef[];
  member_count: number;
}

export type SettingType = "text" | "date" | "single_choice" | "multi_choice";

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDef {
  id: number;
  key: string;
  name: string;
  description: string | null;
  section: string | null;
  type: SettingType;
  options: SettingOption[] | null;
  value: unknown;
}

export interface AppSettingGroup {
  id: number | null;
  key: string | null;
  name: string;
  settings: SettingDef[];
}

export type NotificationChannel = "email" | "sms" | "whatsapp";

export interface NotificationChannelConfig {
  channel: NotificationChannel;
  config: Record<string, string> | null;
}

export type WorkspaceType = "individual" | "organization";

export type AuthProvider = "microsoft_entra" | "google_workspace" | "email_otp";

export interface WorkspaceDetail {
  id: number;
  name: string;
  slug: string;
  type: WorkspaceType;
  restrict_members_to_workspace: boolean;
  auth_provider: AuthProvider | null;
  auth_provider_config: Record<string, string> | null;
}

export type AuthMethodProvider = "password" | "google" | "microsoft" | "email_otp";

export interface AuthMethod {
  provider: AuthMethodProvider;
  enabled: boolean;
  linked: boolean;
  provider_email: string | null;
}

export interface AuditLog {
  id: number;
  workspace_id: number | null;
  user_email: string;
  occurred_at: string;
  ip_address: string;
  location_country: string | null;
  location_city: string | null;
  device: string | null;
  browser: string | null;
  event_type: string;
  application: string;
  event_metadata: Record<string, unknown>;
}

export interface AuditLogFacets {
  event_types: string[];
  applications: string[];
  devices: string[];
  locations: string[];
  ip_addresses: string[];
}
