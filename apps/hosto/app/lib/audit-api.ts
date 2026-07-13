import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";

export interface AuditChange {
  before: unknown;
  after: unknown;
}

export interface AuditLogEntry {
  id: number;
  workspace_id: number;
  patient_id: number | null;
  user_id: number;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, AuditChange> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditActor {
  id: number;
  name: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pages: number;
  actors: AuditActor[];
}

async function parseJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, unknown> | null;
    const message = err != null ? String(err.detail ?? err.message ?? "Erreur") : "Erreur";
    throw new ApiError(message, response.status);
  }
  return data as T;
}

export async function getPatientAudit(
  patientId: number | string,
  page = 1,
  pageSize = 20,
  userId?: number | null,
): Promise<AuditLogPage> {
  const qs = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (userId != null) qs.set("user_id", String(userId));
  return parseJson<AuditLogPage>(await apiFetch(`/api/patients/${patientId}/audit?${qs}`));
}
