"use client";

import { apiFetch } from "@repo/network/client";

export type StatutMissionAudit = "PREPARATION" | "EN_COURS" | "CLOTUREE";
export type StatutControle = "A_FAIRE" | "EN_COURS" | "TERMINE" | "A_REVOIR" | "VALIDE";
export type StatutEtape = "A_FAIRE" | "EN_COURS" | "TERMINEE";
export type StatutDocumentDemande = "DEMANDE" | "RECU" | "MANQUANT";
export type NiveauRisque = "FAIBLE" | "MOYEN" | "ELEVE";
export type StatutRisque = "IDENTIFIE" | "EN_TRAITEMENT" | "MAITRISE";
export type StatutAnomalie = "IDENTIFIEE" | "EN_TRAITEMENT" | "RESOLUE";
export type TypeRapport = "PROVISOIRE" | "FINAL";

export const STATUT_MISSION_LABELS: Record<StatutMissionAudit, string> = {
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

export const NIVEAU_RISQUE_LABELS: Record<NiveauRisque, string> = { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé" };
export const STATUT_RISQUE_LABELS: Record<StatutRisque, string> = {
  IDENTIFIE: "Identifié",
  EN_TRAITEMENT: "En traitement",
  MAITRISE: "Maîtrisé",
};
export const STATUT_ANOMALIE_LABELS: Record<StatutAnomalie, string> = {
  IDENTIFIEE: "Identifiée",
  EN_TRAITEMENT: "En traitement",
  RESOLUE: "Résolue",
};

export interface MissionAudit {
  id: number;
  workspace_id: number;
  code: string;
  nom: string;
  tiers_id: number | null;
  type_audit: string | null;
  periode_debut: string | null;
  periode_fin: string | null;
  objectifs: string | null;
  responsable_user_id: number | null;
  statut: StatutMissionAudit;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface MissionAuditSummary {
  id: number;
  code: string;
  nom: string;
  tiers_id: number | null;
  statut: StatutMissionAudit;
  responsable_user_id: number | null;
  periode_debut: string | null;
  periode_fin: string | null;
  controles_total: number;
  controles_valides: number;
  anomalies_ouvertes: number;
  risques_ouverts: number;
}

export interface MissionAuditInput {
  nom: string;
  tiers_id?: number | null;
  type_audit?: string | null;
  periode_debut?: string | null;
  periode_fin?: string | null;
  objectifs?: string | null;
  responsable_user_id?: number | null;
  statut?: StatutMissionAudit;
}

export async function listMissionsAudit(params?: { tiers_id?: number; statut?: string }): Promise<MissionAuditSummary[]> {
  const qs = new URLSearchParams();
  if (params?.tiers_id) qs.set("tiers_id", String(params.tiers_id));
  if (params?.statut) qs.set("statut", params.statut);
  const res = await apiFetch(`/api/bfm/audit/missions?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMissionAudit(id: number): Promise<MissionAudit> {
  const res = await apiFetch(`/api/bfm/audit/missions/${id}`);
  if (!res.ok) throw new Error("Mission introuvable");
  return res.json();
}

export async function createMissionAudit(input: MissionAuditInput): Promise<MissionAudit> {
  const res = await apiFetch("/api/bfm/audit/missions", { method: "POST", body: input });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Erreur lors de la création de la mission");
  }
  return res.json();
}

export async function updateMissionAudit(id: number, input: Partial<MissionAuditInput>): Promise<MissionAudit> {
  const res = await apiFetch(`/api/bfm/audit/missions/${id}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de la mission");
  return res.json();
}

export interface HistoriqueMissionEntry {
  id: number;
  mission_id: number;
  evenement: string;
  par_user_id: number | null;
  par_nom: string | null;
  survenu_le: string;
}

export async function getHistoriqueMission(missionId: number): Promise<HistoriqueMissionEntry[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/historique`);
  if (!res.ok) return [];
  return res.json();
}

// ───────────────────────── Équipe ─────────────────────────

export interface EquipeMembre {
  id: number;
  user_id: number;
  user_name: string | null;
  created_at: string;
}

export async function listEquipe(missionId: number): Promise<EquipeMembre[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/equipe`);
  if (!res.ok) return [];
  return res.json();
}

export async function addEquipe(missionId: number, userId: number): Promise<EquipeMembre> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/equipe`, { method: "POST", body: { user_id: userId } });
  if (!res.ok) throw new Error("Erreur lors de l'ajout à l'équipe");
  return res.json();
}

export async function removeEquipe(missionId: number, userId: number): Promise<void> {
  await apiFetch(`/api/bfm/audit/missions/${missionId}/equipe/${userId}`, { method: "DELETE" });
}

// ───────────────────────── Étapes ─────────────────────────

export interface Etape {
  id: number;
  mission_id: number;
  nom: string;
  ordre: number;
  statut: StatutEtape;
  date_prevue: string | null;
}

export async function listEtapes(missionId: number): Promise<Etape[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/etapes`);
  if (!res.ok) return [];
  return res.json();
}

export async function createEtape(missionId: number, input: { nom: string; ordre?: number; date_prevue?: string }): Promise<Etape> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/etapes`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de l'étape");
  return res.json();
}

export async function updateEtape(missionId: number, etapeId: number, input: Partial<Etape>): Promise<Etape> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/etapes/${etapeId}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de l'étape");
  return res.json();
}

export async function deleteEtape(missionId: number, etapeId: number): Promise<void> {
  await apiFetch(`/api/bfm/audit/missions/${missionId}/etapes/${etapeId}`, { method: "DELETE" });
}

// ───────────────────────── Documents demandés ─────────────────────────

export interface DocumentDemande {
  id: number;
  mission_id: number;
  nom: string;
  statut: StatutDocumentDemande;
  date_demande: string | null;
  date_reception: string | null;
  document_id: number | null;
}

export async function listDocumentsDemandes(missionId: number): Promise<DocumentDemande[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/documents-demandes`);
  if (!res.ok) return [];
  return res.json();
}

export async function createDocumentDemande(missionId: number, input: { nom: string; date_demande?: string }): Promise<DocumentDemande> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/documents-demandes`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de la demande");
  return res.json();
}

export async function updateDocumentDemande(
  missionId: number,
  demandeId: number,
  input: Partial<DocumentDemande>,
): Promise<DocumentDemande> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/documents-demandes/${demandeId}`, {
    method: "PUT",
    body: input,
  });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du document demandé");
  return res.json();
}

export async function deleteDocumentDemande(missionId: number, demandeId: number): Promise<void> {
  await apiFetch(`/api/bfm/audit/missions/${missionId}/documents-demandes/${demandeId}`, { method: "DELETE" });
}

// ───────────────────────── Checklist (contrôles) ─────────────────────────

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
}

export async function listControles(missionId: number): Promise<Controle[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/controles`);
  if (!res.ok) return [];
  return res.json();
}

export async function createControle(
  missionId: number,
  input: { libelle: string; aide?: string; assigne_user_id?: number; position?: number },
): Promise<Controle> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/controles`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du contrôle");
  return res.json();
}

export async function updateControle(missionId: number, controleId: number, input: Partial<Controle>): Promise<Controle> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/controles/${controleId}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du contrôle");
  return res.json();
}

export async function changerStatutControle(
  missionId: number,
  controleId: number,
  statut: StatutControle,
  commentaire?: string,
): Promise<Controle> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/controles/${controleId}/statut`, {
    method: "PATCH",
    body: { statut, commentaire },
  });
  if (!res.ok) throw new Error("Erreur lors du changement de statut");
  return res.json();
}

export async function deleteControle(missionId: number, controleId: number): Promise<void> {
  await apiFetch(`/api/bfm/audit/missions/${missionId}/controles/${controleId}`, { method: "DELETE" });
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

export async function getHistoriqueControle(missionId: number, controleId: number): Promise<ControleHistoriqueEntry[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/controles/${controleId}/historique`);
  if (!res.ok) return [];
  return res.json();
}

export async function dupliquerControles(missionId: number, depuisMissionId: number): Promise<Controle[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/dupliquer-controles?depuis_mission_id=${depuisMissionId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Erreur lors de la duplication de la checklist");
  return res.json();
}

// ───────────────────────── Risques ─────────────────────────

export interface Risque {
  id: number;
  mission_id: number;
  titre: string;
  description: string | null;
  niveau: NiveauRisque;
  statut: StatutRisque;
}

export async function listRisques(missionId: number): Promise<Risque[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/risques`);
  if (!res.ok) return [];
  return res.json();
}

export async function createRisque(
  missionId: number,
  input: { titre: string; description?: string; niveau?: NiveauRisque },
): Promise<Risque> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/risques`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création du risque");
  return res.json();
}

export async function updateRisque(missionId: number, risqueId: number, input: Partial<Risque>): Promise<Risque> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/risques/${risqueId}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour du risque");
  return res.json();
}

// ───────────────────────── Anomalies ─────────────────────────

export interface Anomalie {
  id: number;
  mission_id: number;
  controle_id: number | null;
  risque_id: number | null;
  titre: string;
  description: string | null;
  recommandation: string | null;
  actions_correctives: string | null;
  statut: StatutAnomalie;
}

export async function listAnomalies(missionId: number): Promise<Anomalie[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/anomalies`);
  if (!res.ok) return [];
  return res.json();
}

export async function createAnomalie(
  missionId: number,
  input: {
    titre: string;
    description?: string;
    controle_id?: number;
    risque_id?: number;
    recommandation?: string;
    actions_correctives?: string;
  },
): Promise<Anomalie> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/anomalies`, { method: "POST", body: input });
  if (!res.ok) throw new Error("Erreur lors de la création de l'anomalie");
  return res.json();
}

export async function updateAnomalie(missionId: number, anomalieId: number, input: Partial<Anomalie>): Promise<Anomalie> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/anomalies/${anomalieId}`, { method: "PUT", body: input });
  if (!res.ok) throw new Error("Erreur lors de la mise à jour de l'anomalie");
  return res.json();
}

// ───────────────────────── Rapports ─────────────────────────

export interface Rapport {
  id: number;
  mission_id: number;
  type: TypeRapport;
  document_id: number | null;
  genere_par_user_id: number | null;
  genere_le: string;
}

export async function listRapports(missionId: number): Promise<Rapport[]> {
  const res = await apiFetch(`/api/bfm/audit/missions/${missionId}/rapports`);
  if (!res.ok) return [];
  return res.json();
}

export async function deposerRapport(missionId: number, type: TypeRapport, file: File): Promise<Rapport> {
  const form = new FormData();
  form.append("type", type);
  form.append("file", file);
  const res = await fetch(`/api/bfm/audit/missions/${missionId}/rapports`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? "Erreur lors du dépôt du rapport");
  return data;
}

// ───────────────────────── Pièces jointes ─────────────────────────

export interface DocumentBrief {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  category: string | null;
  created_at: string;
}

export async function listDocumentsOwner(ownerType: "mission" | "controle", ownerId: number): Promise<DocumentBrief[]> {
  const res = await apiFetch(`/api/bfm/audit/${ownerType}/${ownerId}/documents`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadDocumentOwner(
  ownerType: "mission" | "controle",
  ownerId: number,
  file: File,
  category?: string,
): Promise<DocumentBrief> {
  const form = new FormData();
  form.append("file", file);
  if (category) form.append("category", category);
  const res = await fetch(`/api/bfm/audit/${ownerType}/${ownerId}/documents`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? "Erreur lors de l'envoi du document");
  return data;
}
