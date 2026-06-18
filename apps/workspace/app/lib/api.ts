import type { Member, Group, AppPermissionGroup } from "./types";

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

function jsonRequest(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

export async function listMembers(workspaceId: number): Promise<{ members: Member[] }> {
  const response = await fetch(`/api/workspaces/${workspaceId}/members`);
  return parseResponse(response);
}

export async function checkMemberEmail(
  workspaceId: number,
  email: string
): Promise<{ exists: boolean; full_name?: string | null; already_member?: boolean }> {
  const response = await fetch(
    `/api/workspaces/${workspaceId}/members/check-email`,
    jsonRequest("POST", { email })
  );
  return parseResponse(response);
}

export async function createMember(
  workspaceId: number,
  data: { email: string; password?: string; full_name?: string; group_ids?: number[] }
): Promise<Member> {
  const response = await fetch(
    `/api/workspaces/${workspaceId}/members`,
    jsonRequest("POST", data)
  );
  return parseResponse(response);
}

export async function removeMember(workspaceId: number, membershipId: number) {
  const response = await fetch(
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
  const response = await fetch(
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
  const response = await fetch(
    `/api/workspaces/${workspaceId}/members/${membershipId}/groups`,
    jsonRequest("PUT", { group_ids: groupIds })
  );
  return parseResponse(response);
}

export async function listGroups(workspaceId: number): Promise<{ groups: Group[] }> {
  const response = await fetch(`/api/workspaces/${workspaceId}/groups`);
  return parseResponse(response);
}

export async function createGroup(
  workspaceId: number,
  data: { name: string; description?: string; parent_id?: number | null }
): Promise<Group> {
  const response = await fetch(
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
  const response = await fetch(
    `/api/workspaces/${workspaceId}/groups/${groupId}`,
    jsonRequest("PATCH", data)
  );
  return parseResponse(response);
}

export async function deleteGroup(workspaceId: number, groupId: number) {
  const response = await fetch(
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
  const response = await fetch(
    `/api/workspaces/${workspaceId}/groups/${groupId}/permissions`,
    jsonRequest("PUT", { permission_ids: permissionIds })
  );
  return parseResponse(response);
}

export async function listPermissions(): Promise<{ groups: AppPermissionGroup[] }> {
  const response = await fetch(`/api/permissions`);
  return parseResponse(response);
}
