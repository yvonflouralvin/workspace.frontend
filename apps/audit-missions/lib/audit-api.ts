"use client";

import { apiFetch } from "@repo/network/client";

export type StatutMission = "PREPARATION" | "EN_COURS" | "CLOTUREE";
export type StatutControle = "A_FAIRE" | "EN_COURS" | "TERMINE" | "A_REVOIR" | "VALIDE";
export type StatutAnomalie = "IDENTIFIEE" | "EN_TRAITEMENT" | "RESOLUE";

export const STATUT_MISSION_LABELS: Record<StatutMission, string> = {
  PREPARATION: "Préparation",
  EN_COURS: "En cours",
  CLOTUREE: "Clôturée",
};

export const STATUT_CONTROLE_LABELS: Record<StatutControle, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  A_REVOIR: "À revoir",
  VALIDE: "Validé",
};

export const STATUT_ANOMALIE_LABELS: Record<StatutAnomalie, string> = {
  IDENTIFIEE: "Identifiée",
  EN_TRAITEMENT: "En traitement",
  RESOLUE: "Résolue",
};

export interface MissionSummary {
  id: number;
  code: string;
  nom: string;
  tiers_id: number | null;
  statut: StatutMission;
  responsable_user_id: number | null;
  periode_debut: string | null;
  periode_fin: string | null;
  controles_total: number;
  controles_valides: number;
  anomalies_ouvertes: number;
}

export interface MissionDetail {
  id: number;
  workspace_id: number;
  code: string;
  nom: string;
  tiers_id: number | null;
  project_id: number | null;
  type_audit: string | null;
  periode_debut: string | null;
  periode_fin: string | null;
  objectifs: string | null;
  responsable_user_id: number | null;
  statut: StatutMission;
  rapport_provisoire_document_id: number | null;
  rapport_final_document_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface MissionInput {
  nom: string;
  tiers_id?: number | null;
  project_id?: number | null;
  type_audit?: string | null;
  periode_debut?: string | null;
  periode_fin?: string | null;
  objectifs?: string | null;
  responsable_user_id?: number | null;
  statut?: StatutMission;
}

export async function listMissions(params?: { tiers_id?: number; statut?: StatutMission }): Promise<MissionSummary[]> {
  const qs = new URLSearchParams();
  if (params?.tiers_id) qs.set("tiers_id", String(params.tiers_id));
  if (params?.statut) qs.set("statut", params.statut);
  const res = await apiFetch(`/api/audit/missions?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMission(id: number): Promise<MissionDetail> {
  const res = await apiFetch(`/api/audit/missions/${id}`);
  if (!res.ok) throw new Error("Mission introuvable");
  return res.json();
}

export async function createMission(input: MissionInput): Promise<MissionDetail> {
  const res = await apiFetch("/api/audit/missions", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création");
  }
  return res.json();
}

export async function updateMission(id: number, patch: Partial<MissionInput>): Promise<MissionDetail> {
  const res = await apiFetch(`/api/audit/missions/${id}`, { method: "PUT", body: patch });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la mise à jour");
  }
  return res.json();
}

export interface EquipeMembre {
  id: number;
  user_id: number;
  user_name: string | null;
  created_at: string;
}

export async function listEquipe(missionId: number): Promise<EquipeMembre[]> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/equipe`);
  if (!res.ok) return [];
  return res.json();
}

export async function addEquipe(missionId: number, userId: number): Promise<EquipeMembre> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/equipe`, {
    method: "POST",
    body: { user_id: userId },
  });
  if (!res.ok) throw new Error("Erreur lors de l'ajout");
  return res.json();
}

export async function removeEquipe(missionId: number, userId: number): Promise<void> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/equipe/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la suppression");
}

export interface Controle {
  id: number;
  mission_id: number;
  libelle: string;
  aide: string | null;
  position: number;
  assigne_user_id: number | null;
  assigne_nom: string | null;
  statut: StatutControle;
  commentaire: string | null;
  created_at: string;
  updated_at: string;
}

export interface ControleInput {
  libelle: string;
  aide?: string | null;
  assigne_user_id?: number | null;
  position?: number | null;
}

export async function listControles(missionId: number): Promise<Controle[]> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/controles`);
  if (!res.ok) return [];
  return res.json();
}

export async function createControle(missionId: number, input: ControleInput): Promise<Controle> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/controles`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du contrôle");
  return res.json();
}

export async function updateControle(
  missionId: number,
  controleId: number,
  patch: Partial<ControleInput> & { commentaire?: string | null },
): Promise<Controle> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/controles/${controleId}`, {
    method: "PUT",
    body: patch,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du contrôle");
  return res.json();
}

export async function changerStatutControle(
  missionId: number,
  controleId: number,
  statut: StatutControle,
  commentaire?: string,
): Promise<Controle> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/controles/${controleId}/statut`, {
    method: "PATCH",
    body: { statut, commentaire },
  });
  if (!res.ok) throw new Error("Erreur lors du changement de statut");
  return res.json();
}

export async function deleteControle(missionId: number, controleId: number): Promise<void> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/controles/${controleId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erreur lors de la suppression");
}

export interface ControleHistoriqueEntry {
  id: number;
  controle_id: number;
  statut_avant: string | null;
  statut_apres: string;
  par_user_id: number | null;
  par_nom: string | null;
  commentaire: string | null;
  survenu_le: string;
}

export async function historiqueControle(missionId: number, controleId: number): Promise<ControleHistoriqueEntry[]> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/controles/${controleId}/historique`);
  if (!res.ok) return [];
  return res.json();
}

export async function dupliquerControles(missionId: number, depuisMissionId: number): Promise<Controle[]> {
  const qs = new URLSearchParams({ depuis_mission_id: String(depuisMissionId) });
  const res = await apiFetch(`/api/audit/missions/${missionId}/dupliquer-controles?${qs}`, { method: "POST" });
  if (!res.ok) throw new Error("Erreur lors de la duplication");
  return res.json();
}

export interface Anomalie {
  id: number;
  mission_id: number;
  controle_id: number | null;
  titre: string;
  description: string | null;
  risque: string | null;
  recommandation: string | null;
  actions_correctives: string | null;
  statut: StatutAnomalie;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnomalieInput {
  titre: string;
  description?: string | null;
  controle_id?: number | null;
  risque?: string | null;
  recommandation?: string | null;
  actions_correctives?: string | null;
}

export async function listAnomalies(missionId: number): Promise<Anomalie[]> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/anomalies`);
  if (!res.ok) return [];
  return res.json();
}

export async function createAnomalie(missionId: number, input: AnomalieInput): Promise<Anomalie> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/anomalies`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de l'anomalie");
  return res.json();
}

export async function updateAnomalie(
  missionId: number,
  anomalieId: number,
  patch: Partial<AnomalieInput> & { statut?: StatutAnomalie },
): Promise<Anomalie> {
  const res = await apiFetch(`/api/audit/missions/${missionId}/anomalies/${anomalieId}`, {
    method: "PUT",
    body: patch,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de l'anomalie");
  return res.json();
}

export interface DocumentBrief {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  category: string | null;
  created_at: string;
}

export async function listDocuments(ownerType: "mission" | "controle", ownerId: number): Promise<DocumentBrief[]> {
  const res = await apiFetch(`/api/audit/${ownerType}/${ownerId}/documents`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadDocument(
  ownerType: "mission" | "controle",
  ownerId: number,
  file: File,
): Promise<DocumentBrief> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/audit/${ownerType}/${ownerId}/documents`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Erreur lors de l'envoi du fichier");
  return res.json();
}

export interface WorkspaceMember {
  id: number;
  user: { id: number; email: string; username: string };
}

export async function listMembers(workspaceId: number, q = "", limit = 100): Promise<WorkspaceMember[]> {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  const res = await apiFetch(`/api/workspaces/${workspaceId}/members?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.members;
}

export interface TiersBrief {
  id: number;
  code: string;
  nom: string;
}

export async function getTiersBrief(id: number): Promise<TiersBrief | null> {
  const res = await apiFetch(`/api/tiers/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function searchTiers(q: string): Promise<TiersBrief[]> {
  const qs = new URLSearchParams({ q });
  const res = await apiFetch(`/api/tiers/search?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
