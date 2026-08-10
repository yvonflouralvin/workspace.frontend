import { apiFetch } from "@repo/network/client";

/** Les circuits d'approbation du workspace, vus depuis le module Formulaire.
 *
 *  Deux écrans en ont besoin, pour deux raisons différentes : le catalogue,
 *  pour proposer ceux qui s'ouvrent au grand jour ; les paramètres d'un
 *  formulaire, pour choisir celui qui portera ses réponses. Une seule
 *  définition, sinon la règle du « configuré » divergerait entre les deux.
 */

export interface Circuit {
  /** Le `slug` — c'est lui que le formulaire stocke. */
  id: string;
  title: string;
  /** Une version est publiée : il y a des étapes à jouer. */
  configured: boolean;
  /** Proposé dans le catalogue « Remplir un formulaire ». */
  catalogue_visible: boolean;
  app_key: string | null;
}

/** Rend une liste vide plutôt qu'une erreur.
 *
 *  Une panne des circuits ne doit ni vider le catalogue — les formulaires du
 *  module restent remplissables — ni empêcher de régler le reste d'un
 *  formulaire. L'écran qui appelle dit ce qu'il faut en conclure.
 */
export async function listerCircuits(): Promise<Circuit[]> {
  try {
    const reponse = await apiFetch("/api/approval-flows/flows");
    if (!reponse.ok) return [];
    const circuits = (await reponse.json()) as Circuit[];
    return Array.isArray(circuits) ? circuits : [];
  } catch {
    return [];
  }
}

/** Ceux qu'on peut réellement brancher : sans version publiée, il n'y a aucune
 *  étape à jouer, et la première soumission serait refusée par le circuit. */
export function circuitsUtilisables(circuits: Circuit[]): Circuit[] {
  return circuits.filter((c) => c.configured);
}
