/** Itérations — le conteneur d'un régime.
 *
 *  Toute la sémantique reste dans l'app : aucun package partagé ne connaît le
 *  mot « itération ». Même règle que les jalons.
 */
import { apiFetch } from "@repo/network/client";
import { lireReponse } from "./projects-api";

export type IterationStatut = "planifiee" | "en_cours" | "cloturee";

export const ITERATION_STATUT_LABELS: Record<IterationStatut, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  cloturee: "Clôturée",
};

export const ITERATION_STATUT_TONES: Record<string, { dot: string; chip: string }> = {
  planifiee: { dot: "bg-status-backlog", chip: "bg-status-backlog-container text-status-backlog-on" },
  en_cours: { dot: "bg-status-doing", chip: "bg-status-doing-container text-status-doing" },
  cloturee: { dot: "bg-status-done", chip: "bg-status-done-container text-status-done" },
};

export interface Iteration {
  id: number;
  workspace_id: number;
  projet_id: number;
  phase_id: number;
  nom: string;
  position: number;
  date_debut: string | null;
  date_fin: string | null;
  statut: IterationStatut;
  capacite: number | null;
  /** Horodatage du figeage — non nul dès que l'itération a été ouverte. */
  engagement_le: string | null;
  created_at: string;
  taches_rattachees: number;
  points_rattaches: number;
}

export interface LigneSnapshot {
  task_id: number;
  numero: number;
  titre: string;
  estimation: number;
  etat: string | null;
  categorie: string | null;
}

export interface IterationSnapshot {
  id: number;
  iteration_id: number;
  cloture_le: string;
  cloture_par_nom_cache: string | null;
  engagement: LigneSnapshot[] | null;
  livraison: LigneSnapshot[] | null;
  points_engages: number;
  points_livres: number;
  unite_estimation: string;
  commentaire: string | null;
}

export const iterationsApi = {
  list: (phaseId: number) =>
    apiFetch(`/api/phases/${phaseId}/iterations`).then((r) => lireReponse<Iteration[]>(r)),
  create: (phaseId: number, body: { nom: string; date_debut?: string | null; date_fin?: string | null; capacite?: number | null }) =>
    apiFetch(`/api/phases/${phaseId}/iterations`, { method: "POST", body }).then((r) =>
      lireReponse<Iteration>(r)
    ),
  update: (id: number, body: Partial<Iteration>) =>
    apiFetch(`/api/iterations/${id}`, { method: "PATCH", body }).then((r) =>
      lireReponse<Iteration>(r)
    ),
  remove: (id: number) =>
    apiFetch(`/api/iterations/${id}`, { method: "DELETE" }).then((r) => lireReponse<void>(r)),
  /** Fige l'engagement. Irréversible. */
  ouvrir: (id: number) =>
    apiFetch(`/api/iterations/${id}/ouvrir`, { method: "POST" }).then((r) =>
      lireReponse<Iteration>(r)
    ),
  cloturer: (id: number, commentaire: string | null) =>
    apiFetch(`/api/iterations/${id}/cloturer`, { method: "POST", body: { commentaire } }).then(
      (r) => lireReponse<IterationSnapshot>(r)
    ),
  /** LA VÉLOCITÉ SE LIT ICI — jamais recalculée depuis l'état courant. */
  snapshot: (id: number) =>
    apiFetch(`/api/iterations/${id}/snapshot`).then((r) => lireReponse<IterationSnapshot>(r)),
  rattacher: (id: number, taskIds: number[]) =>
    apiFetch(`/api/iterations/${id}/taches`, { method: "PUT", body: { task_ids: taskIds } }).then(
      (r) => lireReponse<Iteration>(r)
    ),
  detacher: (id: number, taskId: number) =>
    apiFetch(`/api/iterations/${id}/taches/${taskId}`, { method: "DELETE" }).then((r) =>
      lireReponse<Iteration>(r)
    ),
};
