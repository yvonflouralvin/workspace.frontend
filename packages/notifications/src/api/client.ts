// Client notifications in-app. basePath configurable : chaque app garde son propre
// proxy BFF (@repo/network) — ce client pointe vers ce proxy, jamais vers le service.

import { apiFetch } from "@repo/network/client";
import type {
  InAppNotification,
  NotificationList,
  NotificationConfigList,
  NotificationConfigType,
  PermissionOption,
  RuleUpdate,
  WorkspaceGroup,
} from "../types/notification";

export class NotificationsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new NotificationsApiError(data.message ?? data.detail ?? "Une erreur est survenue", response.status);
  }
  return data;
}

const DEFAULT_BASE_PATH = "/api/notifications";

export async function listNotifications(basePath = DEFAULT_BASE_PATH): Promise<NotificationList> {
  return parseResponse(await apiFetch(`${basePath}`));
}

export async function getUnreadCount(basePath = DEFAULT_BASE_PATH): Promise<number> {
  const data = await parseResponse(await apiFetch(`${basePath}/unread-count`));
  return data.unread_count as number;
}

export async function markRead(id: number, basePath = DEFAULT_BASE_PATH): Promise<InAppNotification> {
  return parseResponse(await apiFetch(`${basePath}/${id}/read`, { method: "POST", body: {} }));
}

export async function markAllRead(basePath = DEFAULT_BASE_PATH): Promise<{ updated: number }> {
  return parseResponse(await apiFetch(`${basePath}/read-all`, { method: "POST", body: {} }));
}

// ─── Configuration (Paramètres) ──────────────────────────────────────────────

export async function getConfig(appKey: string, basePath = DEFAULT_BASE_PATH): Promise<NotificationConfigList> {
  return parseResponse(await apiFetch(`${basePath}/config?app_key=${encodeURIComponent(appKey)}`));
}

export async function updateRule(
  typeKey: string,
  body: RuleUpdate,
  basePath = DEFAULT_BASE_PATH,
): Promise<NotificationConfigType> {
  return parseResponse(
    await apiFetch(`${basePath}/config/${encodeURIComponent(typeKey)}`, { method: "PUT", body }),
  );
}

// Listes de destinataires (résolues via les BFF auth de l'app consommatrice).
export async function listGroups(path = "/api/notifications/groups"): Promise<WorkspaceGroup[]> {
  return parseResponse(await apiFetch(path));
}

export async function listPermissions(path = "/api/notifications/permissions"): Promise<PermissionOption[]> {
  return parseResponse(await apiFetch(path));
}
