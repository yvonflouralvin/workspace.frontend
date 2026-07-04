import { apiFetch } from "@repo/network/client";
import { ApiError } from "./api";
import type { EncounterRead } from "./emr-api";
import type { ObservationRead, ClinicalNoteRead } from "./emr-api";
import type { ConditionRead } from "./emr-api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TakeVisiteResponse {
  visite_id: number;
  encounter_id: number;
  encounter: EncounterRead;
}

export interface VisiteMini {
  id: number;
  status: string;
  priority: string;
  reason: string | null;
  arrived_at: string;
  taken_at: string | null;
}

export interface PrescriptionMini {
  id: number;
  encounter_id: number;
  status: string;
  created_at: string;
}

export interface ConsultationAggregate {
  encounter: EncounterRead;
  visite: VisiteMini | null;
  observations: ObservationRead[];
  notes: ClinicalNoteRead[];
  conditions: ConditionRead[];
  prescriptions: PrescriptionMini[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.detail ?? "Une erreur est survenue", res.status);
  return data as T;
}

export async function takeVisite(visiteId: number): Promise<TakeVisiteResponse> {
  return parseResponse(
    await apiFetch(`/api/visites/${visiteId}/take`, { method: "POST", body: {} }),
  );
}

export async function getConsultation(encounterId: number): Promise<ConsultationAggregate> {
  return parseResponse(await apiFetch(`/api/encounters/${encounterId}/consultation`));
}

export async function closeConsultation(encounterId: number, visiteId: number): Promise<void> {
  await parseResponse(
    await apiFetch(`/api/encounters/${encounterId}`, {
      method: "PATCH",
      body: { status: "CLOS", ended_at: new Date().toISOString() },
    }),
  );
  await parseResponse(
    await apiFetch(`/api/visites/${visiteId}/leave`, { method: "POST", body: {} }),
  );
}
