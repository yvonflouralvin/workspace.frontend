"use client";

import { apiFetch } from "@repo/network/client";
import { lire } from "./http";

// Ce que le portail montre à un client. Des types SÉPARÉS de ceux de l'équipe : ni budget, ni
// heures, ni responsable — ils n'existent pas ici, donc aucun écran ne peut les afficher.

export interface PortailMoi {
  user_id: number;
  nom: string;
  email: string;
  tiers_id: number;
  tiers_nom: string;
}

export interface PortailMission {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  type_mission: string | null;
  statut: string;
  start_date: string | null;
  due_date: string | null;
  taches_client_total: number;
  taches_client_terminees: number;
}

export interface PortailPhase {
  id: number;
  nom: string;
  statut: string;
  position: number;
}

export interface PortailTache {
  id: number;
  mission_id: number;
  mission_nom: string | null;
  phase_id: number;
  phase_nom: string | null;
  titre: string;
  description_rich: string | null;
  description: string | null;
  statut: "A_FAIRE" | "EN_COURS" | "TERMINEE";
  priorite: string;
  due_date: string | null;
}

export interface PortailMissionDetail {
  mission: PortailMission;
  phases: PortailPhase[];
  taches: PortailTache[];
}

export const getMoi = async () => lire<PortailMoi>(await apiFetch("/api/bfm/portail/moi"));
export const listMissionsPortail = async () =>
  lire<PortailMission[]>(await apiFetch("/api/bfm/portail/missions"));
export const getMissionPortail = async (id: number) =>
  lire<PortailMissionDetail>(await apiFetch(`/api/bfm/portail/missions/${id}`));
export const listTachesPortail = async () =>
  lire<PortailTache[]>(await apiFetch("/api/bfm/portail/taches"));
export const getTachePortail = async (id: number) =>
  lire<PortailTache>(await apiFetch(`/api/bfm/portail/taches/${id}`));
export const avancerTachePortail = async (id: number, statut: PortailTache["statut"]) =>
  lire<PortailTache>(await apiFetch(`/api/bfm/portail/taches/${id}`, { method: "PATCH", body: { statut } }));
