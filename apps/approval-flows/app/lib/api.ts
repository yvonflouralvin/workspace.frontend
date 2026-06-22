import { apiFetch } from "@repo/network/client";
import type { Binding, FlowCreate, FlowDetail, FlowSummary, FlowUpdate } from "@repo/approval-flows/types/flow";

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

export async function updateFlow(flowId: string, payload: FlowUpdate): Promise<FlowDetail> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}`, {
    method: "PATCH",
    body: payload,
  });
  return parseResponse(response);
}

export async function listBindings(flowId: string): Promise<Binding[]> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}/bindings`);
  return parseResponse(response);
}

export async function setBinding(
  flowId: string,
  stepKey: string,
  payload: { approver_type: string; approver_config: Record<string, unknown> }
): Promise<Binding> {
  const response = await apiFetch(`/api/approval-flows/flows/${flowId}/bindings/${stepKey}`, {
    method: "PUT",
    body: payload,
  });
  return parseResponse(response);
}
