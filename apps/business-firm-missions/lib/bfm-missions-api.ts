"use client";

import { apiFetch } from "@repo/network/client";
import { lire } from "./http";

export type StatutMission = "EN_COURS" | "EN_PAUSE" | "TERMINEE" | "ARCHIVEE";
export type StatutPhase = "A_VENIR" | "EN_COURS" | "CLOTUREE";
export type StatutTache = "A_FAIRE" | "EN_COURS" | "TERMINEE";
export type PrioriteTache = "AUCUNE" | "BASSE" | "MOYENNE" | "HAUTE" | "URGENTE";

export const STATUT_MISSION_LABELS: Record<StatutMission, string> = {
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINEE: "Terminée",
  ARCHIVEE: "Archivée",
};

export const STATUT_PHASE_LABELS: Record<StatutPhase, string> = {
  A_VENIR: "À venir",
  EN_COURS: "En cours",
  CLOTUREE: "Clôturée",
};

export const STATUT_TACHE_LABELS: Record<StatutTache, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
};

export const PRIORITE_LABELS: Record<PrioriteTache, string> = {
  AUCUNE: "Aucune",
  BASSE: "Basse",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  URGENTE: "Urgente",
};

export interface Mission {
  id: number;
  workspace_id: number;
  code: string;
  nom: string;
  tiers_id: number | null;
  description: string | null;
  type_mission: string | null;
  departement: string | null;
  responsable_user_id: number | null;
  priorite: PrioriteTache;
  budget: number | null;
  heures_prevues: number | null;
  start_date: string | null;
  due_date: string | null;
  statut: StatutMission;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface MissionSummary {
  id: number;
  code: string;
  nom: string;
  tiers_id: number | null;
  type_mission: string | null;
  departement: string | null;
  statut: StatutMission;
  priorite: PrioriteTache;
  budget: number | null;
  taches_total: number;
  taches_terminees: number;
}

export interface MissionInput {
  nom: string;
  tiers_id?: number | null;
  description?: string | null;
  type_mission?: string | null;
  departement?: string | null;
  responsable_user_id?: number | null;
  priorite?: PrioriteTache;
  budget?: number | null;
  heures_prevues?: number | null;
  start_date?: string | null;
  due_date?: string | null;
}

export async function listMissions(params?: { tiers_id?: number; statut?: string }): Promise<MissionSummary[]> {
  const qs = new URLSearchParams();
  if (params?.tiers_id) qs.set("tiers_id", String(params.tiers_id));
  if (params?.statut) qs.set("statut", params.statut);
  const res = await apiFetch(`/api/bfm/missions?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMission(id: number): Promise<Mission> {
  const res = await apiFetch(`/api/bfm/missions/${id}`);
  if (!res.ok) throw new Error("Mission introuvable");
  return res.json();
}

export async function createMission(input: MissionInput): Promise<Mission> {
  const res = await apiFetch("/api/bfm/missions", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création de la mission");
  }
  return res.json();
}

export async function updateMission(id: number, input: Partial<MissionInput> & { statut?: StatutMission }): Promise<Mission> {
  const res = await apiFetch(`/api/bfm/missions/${id}`, { method: "PUT", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour de la mission");
  }
  return res.json();
}

// ───────────────────────── Équipe ─────────────────────────

export interface EquipeMembre {
  id: number;
  user_id: number;
  user_name: string | null;
}

export async function listEquipeMission(missionId: number): Promise<EquipeMembre[]> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/equipe`);
  if (!res.ok) return [];
  return res.json();
}

export async function addEquipeMission(missionId: number, userId: number): Promise<EquipeMembre> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/equipe`, { method: "POST", body: { user_id: userId } });
  if (!res.ok) throw new Error("Erreur lors de l'ajout à l'équipe");
  return res.json();
}

export async function removeEquipeMission(missionId: number, userId: number): Promise<void> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/equipe/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors du retrait du collaborateur");
}

// ───────────────────────── Phases ─────────────────────────

export interface Phase {
  id: number;
  mission_id: number;
  nom: string;
  description: string | null;
  /** Document BlockNote sérialisé ; `description` en est le texte brut. */
  description_rich: string | null;
  position: number;
  statut: StatutPhase;
}

export async function listPhases(missionId: number): Promise<Phase[]> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/phases`);
  if (!res.ok) return [];
  return res.json();
}

export async function createPhase(
  missionId: number,
  input: { nom: string; description?: string; description_rich?: string | null; position?: number },
): Promise<Phase> {
  return lire<Phase>(await apiFetch(`/api/bfm/missions/${missionId}/phases`, { method: "POST", body: input }));
}

export async function updatePhase(missionId: number, phaseId: number, input: Partial<Phase>): Promise<Phase> {
  return lire<Phase>(await apiFetch(`/api/bfm/missions/${missionId}/phases/${phaseId}`, { method: "PUT", body: input }));
}

export async function deletePhase(missionId: number, phaseId: number): Promise<void> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/phases/${phaseId}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la suppression de la phase");
  }
}

// ───────────────────────── Tâches ─────────────────────────

export interface Tache {
  id: number;
  mission_id: number;
  phase_id: number;
  titre: string;
  description: string | null;
  description_rich: string | null;
  statut: StatutTache;
  priorite: PrioriteTache;
  assignee_user_id: number | null;
  assignee_nom: string | null;
  /** La tâche revient au client de la mission : il la voit, avec son fil et ses documents. */
  assignee_client: boolean;
  position: number;
  due_date: string | null;
}

export async function listTaches(missionId: number): Promise<Tache[]> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/taches`);
  if (!res.ok) return [];
  return res.json();
}

export async function createTache(
  missionId: number,
  phaseId: number,
  input: {
    titre: string;
    description?: string;
    description_rich?: string | null;
    priorite?: PrioriteTache;
    assignee_user_id?: number | null;
    assignee_client?: boolean;
    due_date?: string | null;
  },
): Promise<Tache> {
  return lire<Tache>(
    await apiFetch(`/api/bfm/missions/${missionId}/phases/${phaseId}/taches`, { method: "POST", body: input }),
  );
}

export async function updateTache(missionId: number, tacheId: number, input: Partial<Tache>): Promise<Tache> {
  return lire<Tache>(await apiFetch(`/api/bfm/missions/${missionId}/taches/${tacheId}`, { method: "PUT", body: input }));
}

export async function deleteTache(missionId: number, tacheId: number): Promise<void> {
  await apiFetch(`/api/bfm/missions/${missionId}/taches/${tacheId}`, { method: "DELETE" });
}
