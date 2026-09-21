"use client";

import { apiFetch } from "@repo/network/client";
import { lire } from "./http";

export type StatutMission = "EN_COURS" | "EN_PAUSE" | "TERMINEE" | "ARCHIVEE";
export type StatutPhase = "A_VENIR" | "EN_COURS" | "CLOTUREE";
/** Le cycle d'une tâche : À faire → En cours → Terminée (par l'exécutant) → Validée (par le validateur).
 *  À revoir : le validateur la renvoie à l'exécutant. Qui peut passer d'un statut à l'autre, c'est le
 *  serveur qui le dit (`statuts_possibles`) — jamais un écran qui le déduit. */
export type StatutTache = "A_FAIRE" | "EN_COURS" | "TERMINEE" | "VALIDEE" | "A_REVOIR";
export type PrioriteTache = "AUCUNE" | "BASSE" | "MOYENNE" | "HAUTE" | "URGENTE";
/** Ce que la tâche demande : une tâche ordinaire, un document que le CLIENT doit fournir, ou un contrôle. */
export type TypeTache = "STANDARD" | "DOCUMENT_A_FOURNIR" | "CONTROLE";

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
  VALIDEE: "Validée",
  A_REVOIR: "À revoir",
};

export const TYPE_TACHE_LABELS: Record<TypeTache, string> = {
  STANDARD: "Tâche",
  DOCUMENT_A_FOURNIR: "Document à fournir",
  CONTROLE: "Contrôle à effectuer",
};

export const PRIORITE_LABELS: Record<PrioriteTache, string> = {
  AUCUNE: "Aucune",
  BASSE: "Basse",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  URGENTE: "Urgente",
};

/** Ce que le responsable accorde à un collaborateur. Les libellés viennent du serveur (`listDroits`). */
export type Droit =
  | "mission.modifier"
  | "phase.ajouter"
  | "phase.modifier"
  | "tache.ajouter"
  | "tache.modifier"
  | "tache.valider";

/** Ce que l'appelant peut faire sur la mission : de quoi n'afficher que ce qui marchera. */
export interface MesDroits {
  membre: boolean;
  /** Responsable ou créateur : tous les droits, et lui seul compose l'équipe et désigne les validateurs. */
  complet: boolean;
  droits: Droit[];
}

export function peut(mission: { mes_droits?: MesDroits | null } | null | undefined, droit: Droit): boolean {
  return mission?.mes_droits?.droits.includes(droit) ?? false;
}

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
  mes_droits: MesDroits | null;
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
  droits: Droit[];
}

export async function listEquipeMission(missionId: number): Promise<EquipeMembre[]> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/equipe`);
  if (!res.ok) return [];
  return res.json();
}

export async function addEquipeMission(missionId: number, userId: number, droits: Droit[]): Promise<EquipeMembre> {
  return lire<EquipeMembre>(
    await apiFetch(`/api/bfm/missions/${missionId}/equipe`, { method: "POST", body: { user_id: userId, droits } }),
  );
}

export async function updateEquipeMission(missionId: number, userId: number, droits: Droit[]): Promise<EquipeMembre> {
  return lire<EquipeMembre>(
    await apiFetch(`/api/bfm/missions/${missionId}/equipe/${userId}`, { method: "PUT", body: { droits } }),
  );
}

export async function removeEquipeMission(missionId: number, userId: number): Promise<void> {
  await lire<void>(await apiFetch(`/api/bfm/missions/${missionId}/equipe/${userId}`, { method: "DELETE" }));
}

/** Quelqu'un qui travaille sur la mission — responsable, créateur ou équipe — et ce qu'il y peut faire. */
export interface MembreMission {
  user_id: number;
  user_name: string | null;
  complet: boolean;
  droits: Droit[];
  peut_valider: boolean;
}

export async function listMembresMission(missionId: number): Promise<MembreMission[]> {
  const res = await apiFetch(`/api/bfm/missions/${missionId}/membres`);
  if (!res.ok) return [];
  return res.json();
}

export async function listDroits(): Promise<{ cle: Droit; libelle: string }[]> {
  const res = await apiFetch("/api/bfm/droits");
  if (!res.ok) return [];
  return res.json();
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
  type_tache: TypeTache;
  /** Ce que le contrôleur a constaté — propre aux tâches de type « Contrôle à effectuer ». */
  observation: string | null;
  description: string | null;
  description_rich: string | null;
  statut: StatutTache;
  priorite: PrioriteTache;
  assignee_user_id: number | null;
  assignee_nom: string | null;
  /** Celui qui passe la tâche de « Terminée » à « Validée » (ou la remet à revoir). Jamais l'exécutant. */
  validateur_user_id: number | null;
  validateur_nom: string | null;
  /** Ce que l'APPELANT peut faire de la tâche — décidé par le serveur, à ne jamais redéduire ici. */
  statuts_possibles: StatutTache[];
  peut_modifier: boolean;
  /** Faire le travail : observation et constats d'un contrôle. */
  peut_contribuer: boolean;
  /** Parler sur la tâche : fil et documents. */
  peut_commenter: boolean;
  /** Valider le résultat de la tâche, et des actions correctives de son contrôle. */
  peut_valider: boolean;
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

/** Une tâche assignée à l'utilisateur, avec de quoi la situer hors de sa mission. */
export interface MaTache extends Tache {
  mission_nom: string;
  mission_code: string;
  phase_nom: string;
  /** La mission a un client : sans lui, la tâche ne peut pas lui être assignée. */
  client_disponible: boolean;
  /** Elle est terminée et c'est à MOI de la valider. */
  a_valider: boolean;
}

export async function listMesTaches(terminees: boolean): Promise<MaTache[]> {
  const res = await apiFetch(`/api/bfm/mes-taches${terminees ? "?terminees=true" : ""}`);
  if (!res.ok) throw new Error("Impossible de charger vos tâches.");
  return res.json();
}

export async function createTache(
  missionId: number,
  phaseId: number,
  input: {
    titre: string;
    type_tache?: TypeTache;
    /** Réservé au responsable de la mission. */
    validateur_user_id?: number | null;
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
