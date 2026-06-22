// packages/approval-flows/api/client.ts
//
// basePath configurable : chaque app consommatrice (hr, approval-flows, workspace...)
// garde son propre proxy BFF (`@repo/network` côté serveur) — ce client ne fait que
// pointer vers ce proxy, jamais directement vers le service approval_flows.

import { apiFetch } from "@repo/network/client";
import type { FlowDetail } from "../types/flow.js";
import type { DecisionIn, RequestCreate, RequestDetail, RequestSummary } from "../types/request.js";

export class ApprovalFlowsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new ApprovalFlowsApiError(data.message ?? data.detail ?? "Une erreur est survenue", response.status);
  }

  return data;
}

const DEFAULT_BASE_PATH = "/api/approval-flows";

export async function getFlow(flowId: string, basePath = DEFAULT_BASE_PATH): Promise<FlowDetail> {
  const response = await apiFetch(`${basePath}/flows/${flowId}`);
  return parseResponse(response);
}

export async function submitRequest(
  payload: RequestCreate,
  basePath = DEFAULT_BASE_PATH
): Promise<RequestDetail> {
  const response = await apiFetch(`${basePath}/requests`, {
    method: "POST",
    body: payload,
  });
  return parseResponse(response);
}

export async function listTasks(basePath = DEFAULT_BASE_PATH): Promise<RequestSummary[]> {
  const response = await apiFetch(`${basePath}/requests?approver=true`);
  return parseResponse(response);
}

export async function listSubmissions(basePath = DEFAULT_BASE_PATH): Promise<RequestSummary[]> {
  const response = await apiFetch(`${basePath}/requests?mine=true`);
  return parseResponse(response);
}

export async function getRequest(requestId: string, basePath = DEFAULT_BASE_PATH): Promise<RequestDetail> {
  const response = await apiFetch(`${basePath}/requests/${requestId}`);
  return parseResponse(response);
}

export async function decideRequest(
  requestId: string,
  payload: DecisionIn,
  basePath = DEFAULT_BASE_PATH
): Promise<RequestDetail> {
  const response = await apiFetch(`${basePath}/requests/${requestId}/decide`, {
    method: "POST",
    body: payload,
  });
  return parseResponse(response);
}
