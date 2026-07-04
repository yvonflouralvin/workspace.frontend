import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";
import type { VisitePriority, PatientInfo } from "./visites-api";

export type QueueMode = "FIFO" | "TRIAGE";

export interface ServiceQueueInfo {
  id: number;
  nom: string;
  code: string;
  queue_mode: QueueMode;
}

export interface QueueEntry {
  id: number;
  patient_id: number;
  service_id: number;
  status: string;
  priority: VisitePriority;
  reason: string | null;
  notes: string | null;
  triage_note: string | null;
  arrived_at: string;
  wait_minutes: number;
  patient: PatientInfo;
}

export interface QueueResponse {
  service_id: number;
  service_nom: string;
  queue_mode: QueueMode;
  items: QueueEntry[];
  total: number;
}

export interface OverviewEntry {
  service: ServiceQueueInfo;
  waiting_count: number;
  next_patient: QueueEntry | null;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.detail ?? "Une erreur est survenue", res.status);
  return data as T;
}

export async function getServiceQueue(serviceId: number): Promise<QueueResponse> {
  return parseResponse(await apiFetch(`/api/services/${serviceId}/queue`));
}

export async function getQueuesOverview(): Promise<OverviewEntry[]> {
  return parseResponse(await apiFetch("/api/queues/overview"));
}

export async function triageVisite(
  id: number,
  priority: VisitePriority,
  triageNote?: string,
): Promise<void> {
  const res = await apiFetch(`/api/visites/${id}/triage`, {
    method: "POST",
    body: { priority, triage_note: triageNote ?? null },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.detail ?? "Triage impossible", res.status);
  }
}
