"use client";

import { apiFetch } from "@repo/network/client";
import { lire } from "./http";

export type NatureElement = "ANOMALIE" | "RISQUE" | "RECOMMANDATION" | "ACTION_CORRECTIVE";
export type StatutAction = "PLANIFIEE" | "EXECUTEE" | "RESULTAT_VALIDE";

export const NATURES: NatureElement[] = ["ANOMALIE", "RISQUE", "RECOMMANDATION", "ACTION_CORRECTIVE"];

export const NATURE_LABELS: Record<
  NatureElement,
  { pluriel: string; vide: string; nouveau: string; modifier: string; defini: string; supprime: string }
> = {
  ANOMALIE: {
    pluriel: "Anomalies identifiées", vide: "Aucune anomalie identifiée.",
    nouveau: "Nouvelle anomalie", modifier: "Modifier l'anomalie", defini: "L'anomalie", supprime: "supprimée",
  },
  RISQUE: {
    pluriel: "Risques identifiés", vide: "Aucun risque identifié.",
    nouveau: "Nouveau risque", modifier: "Modifier le risque", defini: "Le risque", supprime: "supprimé",
  },
  RECOMMANDATION: {
    pluriel: "Recommandations", vide: "Aucune recommandation.",
    nouveau: "Nouvelle recommandation", modifier: "Modifier la recommandation", defini: "La recommandation", supprime: "supprimée",
  },
  ACTION_CORRECTIVE: {
    pluriel: "Actions correctives", vide: "Aucune action corrective.",
    nouveau: "Nouvelle action corrective", modifier: "Modifier l'action corrective", defini: "L'action corrective", supprime: "supprimée",
  },
};

export const STATUT_ACTION_LABELS: Record<StatutAction, string> = {
  PLANIFIEE: "Planifiée",
  EXECUTEE: "Exécutée",
  RESULTAT_VALIDE: "Résultat validé",
};

export interface ElementSuivi {
  id: number;
  tache_id: number;
  nature: NatureElement;
  texte: string;
  statut: StatutAction | null;
  responsable_user_id: number | null;
  responsable_nom: string | null;
  echeance: string | null;
  execute_par: number | null;
  execute_par_nom: string | null;
  execute_le: string | null;
  valide_par: number | null;
  valide_par_nom: string | null;
  valide_le: string | null;
}

export interface ElementInput {
  nature: NatureElement;
  texte: string;
  responsable_user_id?: number | null;
  echeance?: string | null;
}

export interface EvenementTache {
  id: number;
  user_id: number | null;
  user_nom: string | null;
  action: string;
  libelle: string;
  created_at: string;
}

/** Une ligne du journal d'une mission : elle dit de quelle tâche elle parle.
 *  `tache_id` est nul quand la tâche a été supprimée — il ne reste alors que son titre. */
export interface EvenementMission extends EvenementTache {
  tache_id: number | null;
  tache_titre: string | null;
  phase_id: number | null;
}

const base = (tacheId: number) => `/api/bfm/taches/${tacheId}`;

export async function listElements(tacheId: number): Promise<ElementSuivi[]> {
  return lire<ElementSuivi[]>(await apiFetch(`${base(tacheId)}/elements`));
}

export async function addElement(tacheId: number, input: ElementInput): Promise<ElementSuivi> {
  return lire<ElementSuivi>(await apiFetch(`${base(tacheId)}/elements`, { method: "POST", body: input }));
}

export async function updateElement(
  tacheId: number,
  elementId: number,
  input: Partial<Pick<ElementSuivi, "texte" | "statut" | "responsable_user_id" | "echeance">>,
): Promise<ElementSuivi> {
  return lire<ElementSuivi>(
    await apiFetch(`${base(tacheId)}/elements/${elementId}`, { method: "PATCH", body: input }),
  );
}

export async function deleteElement(tacheId: number, elementId: number): Promise<void> {
  await lire<void>(await apiFetch(`${base(tacheId)}/elements/${elementId}`, { method: "DELETE" }));
}

export async function listHistorique(tacheId: number): Promise<EvenementTache[]> {
  return lire<EvenementTache[]>(await apiFetch(`${base(tacheId)}/historique`));
}

export async function listHistoriqueMission(missionId: number): Promise<EvenementMission[]> {
  return lire<EvenementMission[]>(await apiFetch(`/api/bfm/missions/${missionId}/historique`));
}
