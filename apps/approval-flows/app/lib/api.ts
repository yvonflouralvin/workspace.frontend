import { apiFetch } from "@repo/network/client";
import type {
  FlowCreate,
  FlowDetail,
  FlowPatch,
  FlowSummary,
  VersionContent,
  VersionDetail,
  VersionSummary,
} from "@repo/approval-flows/types/flow";
import type { RequestDetail, RequestListResponse } from "@repo/approval-flows/types/request";

export interface MemberRecord {
  id: number;
  user: { id: number; email: string; username: string };
}

export interface GroupRecord {
  id: number;
  name: string;
  parent_id: number | null;
}

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
    throw new ApiError(data.message ?? data.detail ?? "Une erreur est survenue", response.status);
  }

  return data;
}

export async function logout() {
  const response = await apiFetch("/api/logout", { method: "POST" });
  return parseResponse(response);
}

export async function listFlows(): Promise<FlowSummary[]> {
  const response = await apiFetch("/api/approval-flows/flows");
  return parseResponse(response);
}

export async function getFlow(flowId: string): Promise<FlowDetail> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}`);
  return parseResponse(response);
}

export async function createFlow(payload: FlowCreate): Promise<FlowDetail> {
  const response = await apiFetch("/api/approval-flows/flows", {
    method: "POST",
    body: payload,
  });
  return parseResponse(response);
}

export async function updateFlow(flowId: string, payload: FlowPatch): Promise<FlowDetail> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}`, {
    method: "PATCH",
    body: payload,
  });
  return parseResponse(response);
}

export async function listVersions(flowId: string): Promise<VersionSummary[]> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}/versions`);
  return parseResponse(response);
}

export async function createVersion(flowId: string, payload: VersionContent): Promise<VersionDetail> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}/versions`, {
    method: "POST",
    body: payload,
  });
  return parseResponse(response);
}

export async function getVersion(flowId: string, versionId: number): Promise<VersionDetail> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}/versions/${versionId}`);
  return parseResponse(response);
}

export async function updateVersion(
  flowId: string,
  versionId: number,
  payload: VersionContent
): Promise<VersionDetail> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}/versions/${versionId}`, {
    method: "PATCH",
    body: payload,
  });
  return parseResponse(response);
}

export async function publishVersion(flowId: string, versionId: number): Promise<VersionDetail> {
  const response = await apiFetch(
    `/api/approval-flows/flows/${flowId}/versions/${versionId}/publish`,
    { method: "POST" }
  );
  return parseResponse(response);
}

export async function deleteVersion(flowId: string, versionId: number): Promise<void> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}/versions/${versionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = await response.json();
    throw new ApiError(data.message ?? data.detail ?? "Une erreur est survenue", response.status);
  }
}

export async function searchMembers(
  workspaceId: number,
  q: string,
  limit = 20
): Promise<MemberRecord[]> {
  const response = await apiFetch(
    `/api/workspaces/${workspaceId}/members?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  const data = await parseResponse(response);
  return data.members;
}

export async function listGroups(workspaceId: number): Promise<GroupRecord[]> {
  const response = await apiFetch(`/api/workspaces/${workspaceId}/groups`);
  const data = await parseResponse(response);
  return data.groups;
}

export interface MyRequestsParams {
  q?: string;
  status?: string[];
  flowId?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

export async function listMyRequests(params: MyRequestsParams = {}): Promise<RequestListResponse> {
  const search = new URLSearchParams();
  search.set("mine", "true");
  if (params.q) search.set("q", params.q);
  for (const status of params.status ?? []) search.append("status", status);
  if (params.flowId) search.set("flow_id", params.flowId);
  if (params.date) search.set("date", params.date);
  search.set("limit", String(params.limit ?? 20));
  search.set("offset", String(params.offset ?? 0));

  const response = await apiFetch(`/api/approval-flows/requests?${search.toString()}`);
  return parseResponse(response);
}

export async function getRequest(requestId: string): Promise<RequestDetail> {
  const response = await apiFetch(`/api/approval-flows/requests/${requestId}`);
  return parseResponse(response);
}
