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

export async function listNotifications(
  basePath = DEFAULT_BASE_PATH,
  // Chercher dans ses notifications : le hub les garde toutes depuis toujours,
  // mais la cloche n'en montre que les dernières. Optionnel, pour que les
  // appels existants (la cloche, justement) ne changent pas d'un caractère.
  params?: { q?: string; app?: string; non_lues?: boolean; limit?: number },
): Promise<NotificationList> {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.app) query.set("app", params.app);
  if (params?.non_lues) query.set("non_lues", "true");
  if (params?.limit) query.set("limit", String(params.limit));
  const suffixe = query.toString() ? `?${query}` : "";
  return parseResponse(await apiFetch(`${basePath}${suffixe}`));
}

export async function listApplications(
  basePath = DEFAULT_BASE_PATH,
): Promise<{ app_key: string }[]> {
  return parseResponse(await apiFetch(`${basePath}/applications`));
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

// ─── Web Push ─────────────────────────────────────────────────────────────────

export async function getPushPublicKey(basePath = DEFAULT_BASE_PATH): Promise<string> {
  const data = await parseResponse(await apiFetch(`${basePath}/push/public-key`));
  return data.public_key as string;
}

export async function savePushSubscription(
  subscription: unknown,
  basePath = DEFAULT_BASE_PATH,
): Promise<void> {
  await parseResponse(
    await apiFetch(`${basePath}/push/subscribe`, { method: "POST", body: subscription as object }),
  );
}

export async function deletePushSubscription(
  endpoint: string,
  basePath = DEFAULT_BASE_PATH,
): Promise<void> {
  await parseResponse(
    await apiFetch(`${basePath}/push/unsubscribe`, { method: "POST", body: { endpoint } }),
  );
}

// Listes de destinataires (résolues via les BFF auth de l'app consommatrice).
export async function listGroups(path = "/api/notifications/groups"): Promise<WorkspaceGroup[]> {
  return parseResponse(await apiFetch(path));
}

export async function listPermissions(path = "/api/notifications/permissions"): Promise<PermissionOption[]> {
  return parseResponse(await apiFetch(path));
}
