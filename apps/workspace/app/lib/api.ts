import { apiFetch, type ApiFetchInit } from "@repo/network/client";
import type {
  Member,
  Group,
  AppPermissionGroup,
  AppSettingGroup,
  WorkspaceDetail,
  WorkspaceType,
  AuthProvider,
  AuthMethod,
  AuthMethodProvider,
  NotificationChannel,
  NotificationChannelConfig,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.message ?? "Une erreur est survenue", response.status);
  }

  return data;
}

function jsonRequest(method: string, body?: unknown): ApiFetchInit {
  return { method, body };
}

export async function listMembers(
  workspaceId: number,
  params: { search?: string; limit?: number; offset?: number } = {}
): Promise<{ members: Member[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("q", params.search);
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  const response = await apiFetch(`/api/workspaces/${workspaceId}/members?${qs}`);
  return parseResponse(response);
}

export async function checkMemberEmail(
  workspaceId: number,
  email: string
): Promise<{ exists: boolean; full_name?: string | null; already_member?: boolean }> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/members/check-email`,
    jsonRequest("POST", { email })
  );
  return parseResponse(response);
}

export async function createMember(
  workspaceId: number,
  data: { email: string; password?: string; full_name?: string; group_ids?: number[] }
): Promise<Member> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/members`,
    jsonRequest("POST", data)
  );
  return parseResponse(response);
}

export async function removeMember(workspaceId: number, membershipId: number) {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/members/${membershipId}`,
    { method: "DELETE" }
  );
  return parseResponse(response);
}

export async function setMemberPermissions(
  workspaceId: number,
  membershipId: number,
  permissionIds: number[]
): Promise<Member> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/members/${membershipId}/permissions`,
    jsonRequest("PUT", { permission_ids: permissionIds })
  );
  return parseResponse(response);
}

export async function setMemberGroups(
  workspaceId: number,
  membershipId: number,
  groupIds: number[]
): Promise<Member> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/members/${membershipId}/groups`,
    jsonRequest("PUT", { group_ids: groupIds })
  );
  return parseResponse(response);
}

export async function listGroups(workspaceId: number): Promise<{ groups: Group[] }> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/groups`);
  return parseResponse(response);
}

export async function createGroup(
  workspaceId: number,
  data: { name: string; description?: string; parent_id?: number | null }
): Promise<Group> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/groups`,
    jsonRequest("POST", data)
  );
  return parseResponse(response);
}

export async function updateGroup(
  workspaceId: number,
  groupId: number,
  data: { name?: string; description?: string; parent_id?: number | null }
): Promise<Group> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/groups/${groupId}`,
    jsonRequest("PATCH", data)
  );
  return parseResponse(response);
}

export async function deleteGroup(workspaceId: number, groupId: number) {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/groups/${groupId}`,
    { method: "DELETE" }
  );
  return parseResponse(response);
}

export async function setGroupPermissions(
  workspaceId: number,
  groupId: number,
  permissionIds: number[]
): Promise<Group> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/groups/${groupId}/permissions`,
    jsonRequest("PUT", { permission_ids: permissionIds })
  );
  return parseResponse(response);
}

export async function listPermissions(): Promise<{ groups: AppPermissionGroup[] }> {
  const response = await apiFetch(`/api/permissions`);
  return parseResponse(response);
}

export async function listWorkspaceSettings(
  workspaceId: number
): Promise<{ groups: AppSettingGroup[] }> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/settings`);
  return parseResponse(response);
}

export async function updateWorkspaceSettings(
  workspaceId: number,
  values: { app_setting_id: number; value: unknown }[]
): Promise<{ groups: AppSettingGroup[] }> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/settings`,
    jsonRequest("PUT", { values })
  );
  return parseResponse(response);
}

export async function listNotificationChannels(
  workspaceId: number
): Promise<{ channels: NotificationChannelConfig[] }> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/notification-channels`);
  return parseResponse(response);
}

export async function updateNotificationChannelConfig(
  workspaceId: number,
  channel: NotificationChannel,
  config: Record<string, string>
): Promise<NotificationChannelConfig> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/notification-channels/${channel}/config`,
    jsonRequest("PUT", { config })
  );
  return parseResponse(response);
}

export async function createWorkspace(
  name: string,
  type: WorkspaceType
): Promise<{ id: number; name: string; slug: string; type: WorkspaceType }> {
  const response = await apiFetch(`/api/workspaces`, jsonRequest("POST", { name, type }));
  return parseResponse(response);
}

export async function getWorkspace(workspaceId: number): Promise<WorkspaceDetail> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}`);
  return parseResponse(response);
}

export async function updateWorkspacePolicy(
  workspaceId: number,
  restrictMembersToWorkspace: boolean
): Promise<WorkspaceDetail> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}`,
    jsonRequest("PATCH", { restrict_members_to_workspace: restrictMembersToWorkspace })
  );
  return parseResponse(response);
}

export async function updateWorkspaceAuthProvider(
  workspaceId: number,
  authProvider: AuthProvider | null,
  authProviderConfig?: Record<string, string>
): Promise<WorkspaceDetail> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}`,
    jsonRequest("PATCH", {
      auth_provider: authProvider,
      auth_provider_config: authProviderConfig,
    })
  );
  return parseResponse(response);
}

export async function getMyAuthMethods(): Promise<{
  methods: AuthMethod[];
  enforced_provider: AuthProvider | null;
}> {
  const response = await apiFetch(`/api/me/auth-methods`);
  return parseResponse(response);
}

export async function updateMyAuthMethod(
  provider: AuthMethodProvider,
  enabled: boolean
): Promise<{ provider: string; enabled: boolean }> {
  const response = await apiFetch(
    `/api/me/auth-methods/${provider}`,
    jsonRequest("PUT", { enabled })
  );
  return parseResponse(response);
}

export async function unlinkMyAuthMethod(provider: AuthMethodProvider) {
  const response = await apiFetch(`/api/me/auth-methods/${provider}`, { method: "DELETE" });
  return parseResponse(response);
}
