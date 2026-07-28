/** Jalons — gates décisionnelles d'un projet.
 *
 *  Un jalon est un point où l'on ne produit rien : on vérifie et on décide. Toute
 *  la sémantique reste ICI, dans l'app : aucun package partagé ne doit connaître
 *  le mot « jalon ».
 */
import { apiFetch } from "@repo/network/client";
import { lireReponse } from "./projects-api";

export type JalonRole = "sortie_de_phase" | "entree_de_phase" | "interne" | "projet";

export const JALON_ROLE_LABELS: Record<JalonRole, string> = {
  sortie_de_phase: "Sortie de phase",
  entree_de_phase: "Entrée de phase",
  interne: "Interne",
  projet: "Projet",
};
export const JALON_ROLE_HINTS: Record<JalonRole, string> = {
  sortie_de_phase: "Ferme la phase : rien ne s'ouvre après elle sans décision.",
  entree_de_phase: "Garde l'entrée de la phase : elle ne s'ouvre pas sans décision.",
  interne: "Point de contrôle dans la phase — n'ouvre ni ne ferme rien.",
  projet: "Échéance portée par le projet, indépendante des phases.",
};
export const JALON_ROLE_ORDER: JalonRole[] = [
  "sortie_de_phase",
  "entree_de_phase",
  "interne",
  "projet",
];

export type JalonStatut =
  | "a_venir"
  | "en_attente_decision"
  | "franchi"
  | "rejete"
  | "en_pause";

export const JALON_STATUT_LABELS: Record<JalonStatut, string> = {
  a_venir: "À venir",
  en_attente_decision: "En attente de décision",
  franchi: "Franchi",
  rejete: "Rejeté",
  en_pause: "En pause",
};

export const JALON_STATUT_TONES: Record<string, { dot: string; chip: string }> = {
  a_venir: { dot: "bg-status-backlog", chip: "bg-status-backlog-container text-status-backlog-on" },
  en_attente_decision: { dot: "bg-status-review", chip: "bg-status-review-container text-status-review" },
  franchi: { dot: "bg-status-done", chip: "bg-status-done-container text-status-done" },
  rejete: { dot: "bg-error", chip: "bg-error-container text-on-error-container" },
  en_pause: { dot: "bg-status-backlog", chip: "bg-surface-container text-on-surface-variant" },
};

export type Verdict = "go" | "kill" | "hold" | "recycle";

/** Un seul enum, des LIBELLÉS qui varient selon le rôle — copie fidèle de
 *  `VERDICT_LABELS` côté backend. Une gate décisionnelle et une échéance
 *  réglementaire ne se racontent pas pareil. */
export const VERDICT_LABELS: Record<JalonRole, Record<Verdict, string>> = {
  sortie_de_phase: {
    go: "Go — on continue",
    kill: "Kill — on arrête définitivement",
    hold: "Hold — suspendu, rien à refaire",
    recycle: "Recycle — travail à reprendre",
  },
  entree_de_phase: {
    go: "Go — la phase peut s'ouvrir",
    kill: "Kill — la phase n'aura pas lieu",
    hold: "Hold — ouverture différée",
    recycle: "Recycle — conditions d'entrée à reprendre",
  },
  interne: {
    go: "Validé",
    kill: "Abandonné",
    hold: "Suspendu",
    recycle: "À reprendre",
  },
  projet: {
    go: "Atteint",
    kill: "Abandonné",
    hold: "Reporté",
    recycle: "À reprendre",
  },
};

/** Ce que le verdict FAIT — `hold` et `recycle` disent tous deux « pas
 *  maintenant », mais l'un n'appelle aucun travail et l'autre en appelle. Sans
 *  cette phrase, le choix se fait au hasard entre deux étiquettes voisines. */
export const VERDICT_EFFETS: Record<Verdict, string> = {
  go: "Ce qui suit peut s'ouvrir. Le jalon est franchi.",
  kill: "La phase est annulée. L'annulation du projet vous sera demandée à part.",
  hold: "Suspendu pour une cause externe : rien à reprendre, on attend.",
  recycle: "Le travail est à reprendre, puis à repasser devant cette gate.",
};

/** Ordre d'affichage — les quatre verdicts sont rendus à poids ÉGAL, aucun n'est
 *  mis en avant. L'ordre suit l'effet sur le flux (débloque → arrête), il ne
 *  désigne pas un choix par défaut. */
export const VERDICT_ORDER: Verdict[] = ["go", "recycle", "hold", "kill"];

export type CritereType = "booleen" | "numerique" | "texte";
export const CRITERE_TYPE_LABELS: Record<CritereType, string> = {
  booleen: "Oui / non",
  numerique: "Nombre",
  texte: "Texte",
};
export const CRITERE_TYPE_ORDER: CritereType[] = ["texte", "numerique", "booleen"];

export type Comparateur = "sup_egal" | "inf_egal" | "egal" | "entre" | "appreciation";
export const COMPARATEUR_LABELS: Record<Comparateur, string> = {
  sup_egal: "Au moins",
  inf_egal: "Au plus",
  egal: "Égal à",
  entre: "Entre",
  appreciation: "À apprécier",
};
export const COMPARATEUR_ORDER: Comparateur[] = [
  "appreciation",
  "sup_egal",
  "inf_egal",
  "egal",
  "entre",
];

export interface Critere {
  id: number;
  jalon_id: number;
  libelle: string;
  position: number;
  type: CritereType;
  comparateur: Comparateur;
  cible: string | null;
  livrable_id: number | null;
  /** Figé : le critère ne bouge plus, sauf déverrouillage motivé. */
  verrouille_le: string | null;
  verrouille_par: number | null;
  deverrouille_motif: string | null;
  /** Proposée depuis le livrable lié — jamais imposée au décideur. */
  valeur_pre_remplie: string | null;
}

export interface CritereSnapshot {
  critere_id: number;
  libelle: string;
  type: string;
  comparateur: string;
  cible: string | null;
  valeur_constatee: string | null;
  verrouille_le: string | null;
}

export interface Decision {
  id: number;
  jalon_id: number;
  verdict: Verdict;
  commentaire: string | null;
  decide_par_user_id: number | null;
  decide_par_nom_cache: string | null;
  decide_le: string;
  criteres_snapshot: CritereSnapshot[] | null;
  revise_decision_id: number | null;
  /** Rendue par quelqu'un d'autre que le décideur désigné — CONSTAT, pas reproche. */
  hors_decideur_designe: boolean;
  /** Écart entre le figeage des critères et la décision. */
  secondes_entre_verrouillage_et_decision: number | null;
}

export interface Forcage {
  id: number;
  jalon_id: number;
  phase_id: number;
  contexte: "ouverture" | "cloture";
  motif: string;
  par_user_id: number | null;
  par_nom_cache: string | null;
  le: string;
}

export interface Jalon {
  id: number;
  workspace_id: number;
  projet_id: number;
  phase_id: number | null;
  nom: string;
  description: string | null;
  role: JalonRole;
  bloquant: boolean;
  date_prevue: string | null;
  statut: JalonStatut;
  position: number;
  decideur_attendu_user_id: number | null;
  decideur_attendu_groupe_id: number | null;
  created_at: string;
  verdict_courant: Verdict | null;
  /** Calculé par le backend : décideur désigné, repli propriétaire, permission. */
  peut_decider: boolean;
}

export interface JalonDetail extends Jalon {
  criteres: Critere[];
  decisions: Decision[];
  forcages: Forcage[];
}

export interface ResultatDecision {
  decision: Decision;
  statut_jalon: JalonStatut;
  /** Un kill annule la phase ; annuler le projet est PROPOSÉ, jamais fait. */
  proposer_annulation_projet: boolean;
}

export const jalonsApi = {
  list: (projectId: number) =>
    apiFetch(`/api/projects/${projectId}/jalons`).then((r) => lireReponse<Jalon[]>(r)),
  get: (id: number) => apiFetch(`/api/jalons/${id}`).then((r) => lireReponse<JalonDetail>(r)),
  create: (projectId: number, body: Partial<Jalon> & { nom: string }) =>
    apiFetch(`/api/projects/${projectId}/jalons`, { method: "POST", body }).then((r) =>
      lireReponse<Jalon>(r)
    ),
  update: (id: number, body: Partial<Jalon>) =>
    apiFetch(`/api/jalons/${id}`, { method: "PATCH", body }).then((r) => lireReponse<Jalon>(r)),
  remove: (id: number) =>
    apiFetch(`/api/jalons/${id}`, { method: "DELETE" }).then((r) => lireReponse<void>(r)),

  createCritere: (jalonId: number, body: Partial<Critere> & { libelle: string }) =>
    apiFetch(`/api/jalons/${jalonId}/criteres`, { method: "POST", body }).then((r) =>
      lireReponse<Critere>(r)
    ),
  updateCritere: (id: number, body: Partial<Critere>) =>
    apiFetch(`/api/criteres/${id}`, { method: "PATCH", body }).then((r) => lireReponse<Critere>(r)),
  deverrouillerCritere: (id: number, motif: string) =>
    apiFetch(`/api/criteres/${id}/deverrouiller`, { method: "POST", body: { motif } }).then((r) =>
      lireReponse<Critere>(r)
    ),

  /** Convoque la gate : fige les critères. Irréversible sans trace. */
  ouvrirDecision: (id: number) =>
    apiFetch(`/api/jalons/${id}/ouvrir-decision`, { method: "POST" }).then((r) =>
      lireReponse<Jalon>(r)
    ),
  decider: (
    id: number,
    body: {
      verdict: Verdict;
      commentaire?: string | null;
      valeurs?: { critere_id: number; valeur: string | null }[];
      revise_decision_id?: number | null;
    }
  ) =>
    apiFetch(`/api/jalons/${id}/decisions`, { method: "POST", body }).then((r) =>
      lireReponse<ResultatDecision>(r)
    ),
};

/** L'échéance est-elle passée ? CALCUL D'ÉCRAN, assumé : rien ne s'en déclenche,
 *  et le serveur n'a pas de « maintenant » stable (une réponse en cache
 *  vieillirait). Le jour où un retard bloque quelque chose ou remonte au
 *  Dashboard, il change de côté et se calcule au backend. */
export function echeanceDepassee(jalon: Jalon): boolean {
  if (!jalon.date_prevue) return false;
  if (jalon.statut === "franchi" || jalon.statut === "rejete") return false;
  return new Date(jalon.date_prevue).getTime() < Date.now();
}

/** Un jalon bloquant non franchi retient la phase — c'est le seul état qui
 *  explique pourquoi une phase refuse de s'ouvrir ou de se clôturer. */
export function retientLaPhase(jalon: Jalon): boolean {
  return jalon.bloquant && jalon.statut !== "franchi";
}

export function verdictLabel(role: JalonRole, verdict: Verdict): string {
  return VERDICT_LABELS[role]?.[verdict] ?? verdict;
}
