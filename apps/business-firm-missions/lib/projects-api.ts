"use client";

import { apiFetch } from "@repo/network/client";

export interface Mission {
  id: number;
  workspace_id: number;
  name: string;
  key: string;
  description: string | null;
  status: string;
  issue: string | null;
  lead_user_id: number | null;
  start_date: string | null;
  due_date: string | null;
  tiers_id: number | null;
  budget: number | null;
  heures_prevues: number | null;
  type_mission: string | null;
  departement: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
  done_count?: number;
}

export interface MissionCreateInput {
  name: string;
  key: string;
  description?: string;
  lead_user_id?: number;
  start_date?: string;
  due_date?: string;
  tiers_id?: number;
  budget?: number;
  heures_prevues?: number;
  type_mission?: string;
  departement?: string;
}

export type MissionUpdateInput = Partial<MissionCreateInput>;

export async function listMissions(params?: {
  tiers_id?: number;
  type_mission?: string;
  departement?: string;
}): Promise<Mission[]> {
  const qs = new URLSearchParams();
  if (params?.tiers_id) qs.set("tiers_id", String(params.tiers_id));
  if (params?.type_mission) qs.set("type_mission", params.type_mission);
  if (params?.departement) qs.set("departement", params.departement);
  const res = await apiFetch(`/api/projects?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMission(id: number): Promise<Mission> {
  const res = await apiFetch(`/api/projects/${id}`);
  if (!res.ok) throw new Error("Mission introuvable");
  return res.json();
}

export async function createMission(input: MissionCreateInput): Promise<Mission> {
  const res = await apiFetch("/api/projects", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création de la mission");
  }
  return res.json();
}

export async function updateMission(id: number, input: MissionUpdateInput): Promise<Mission> {
  const res = await apiFetch(`/api/projects/${id}`, { method: "PATCH", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour de la mission");
  }
  return res.json();
}
