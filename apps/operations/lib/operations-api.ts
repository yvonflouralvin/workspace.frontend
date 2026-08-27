import { apiFetch } from "@repo/network/client";

/** Client du service `operations`. Les formes viennent de
 *  `backends/operations/schemas/planification.py`. */

export type TypePlanning = "PRESTATION" | "ESPACE" | "MATERIEL" | "VEHICULE";
export type StatutPlanning = "BROUILLON" | "PUBLIE" | "ARCHIVE";

export interface AttributDef {
  cle: string;
  libelle: string;
  type: string;
  options: string[];
}

/** Le type est une DONNÉE servie par le backend : l'app n'en code aucun en dur,
 *  et un type ajouté demain apparaît sans qu'on touche au frontend. */
export interface TypeDef {
  cle: TypePlanning;
  libelle: string;
  libelle_pluriel: string;
  ressource_libelle: string;
  ressource_pluriel: string;
  description: string;
  source_rh: boolean;
  champs: string[];
  attributs: AttributDef[];
}

export interface Ressource {
  id: number;
  type: TypePlanning;
  libelle: string;
  nom_affiche: string;
  code: string | null;
  categorie: string | null;
  employee_id: number | null;
  user_id: number | null;
  capacite: number | null;
  reference: string | null;
  /** Nul = aucune cible déclarée, donc aucun jugement porté. */
  heures_hebdo_cible: number | null;
  heures_mensuel_cible: number | null;
  attributs: Record<string, unknown>;
  active: boolean;
}

export type StatutUtilisation = "SOUS_UTILISEE" | "CONFORME" | "SUR_UTILISEE" | "SANS_CIBLE";

export interface Verdict {
  statut: StatutUtilisation;
  cible: number | null;
  ecart_heures: number | null;
  ecart_pct: number | null;
  message: string;
}

export interface RapportPlanning {
  planning: {
    id: number; nom: string; type: TypePlanning; statut: StatutPlanning;
    debut: string; fin: string; jours: number;
  };
  totaux: {
    ressources: number; creneaux: number; heures: number; sites: number;
    heures_sans_site: number; chevauchements: number;
    heures_par_ressource: number; heures_par_semaine: number;
  };
  par_ressource: {
    ressource_id: number; ressource: string; type: string;
    creneaux: number; heures: number; sites: number; part: number;
  }[];
  par_site: {
    site_id: number; site: string; ville: string | null;
    creneaux: number; heures: number; ressources: number;
  }[];
}

export interface ActiviteRessource {
  ressource: {
    id: number; nom: string; type: TypePlanning; categorie: string | null;
    active: boolean; heures_hebdo_cible: number | null; heures_mensuel_cible: number | null;
  };
  fenetre: { depuis: string; jusqu_a: string; jours: number; semaines: number };
  totaux: {
    heures: number; creneaux: number; plannings: number; sites: number;
    en_attente: number;
  };
  moyennes: { hebdomadaire: number; mensuelle: number };
  utilisation: { hebdomadaire: Verdict; mensuelle: Verdict };
  affectations: {
    id: number; debut: string; fin: string; heures: number; objet: string | null;
    site: string | null; site_couleur: string | null;
    planning_id: number | null; planning: string | null;
    statut: "ACCEPTEE" | "DEMANDEE"; demandeur: string | null;
    en_chevauchement: boolean;
  }[];
  affectations_tronquees: number;
}

export interface Groupe {
  id: number;
  type: TypePlanning;
  nom: string;
  description: string | null;
  active: boolean;
  membres: Ressource[];
}

export interface Site {
  id: number;
  nom: string;
  code: string | null;
  adresse: string | null;
  ville: string | null;
  couleur: string | null;
  active: boolean;
}

export interface Planning {
  id: number;
  type: TypePlanning;
  nom: string;
  /** Le nom court dans l'adresse : `/plannings/gardiennage-mars-2026`.
   *  Nul sur d'anciens plannings — l'écran retombe alors sur l'identifiant. */
  slug: string | null;
  debut: string;
  fin: string;
  statut: StatutPlanning;
  note: string | null;
  affectations_count: number;
  chevauchements_count: number;
  /** Vide = aucune restriction : n'importe quelle ressource du bon type. */
  ressource_ids: number[];
  reservation_mode: "APPROBATION" | "AUTOMATIQUE" | null;
  /** Adresse publique du formulaire de réservation. Nulle = pas ouvert. */
  reservation_url: string | null;
  /** Le lien existe mais n'accepte plus rien. Il n'a pas changé : le rouvrir
   *  ne demande de rediffuser aucune adresse. */
  reservation_suspendue: boolean;
  /** Politique de délai du lien public. Nuls = aucune contrainte. */
  reservation_preavis_heures: number | null;
  reservation_horizon_heures: number | null;
}

export interface Affectation {
  id: number;
  planning_id: number;
  ressource_id: number;
  ressource: string | null;
  ressource_type: TypePlanning | null;
  site_id: number | null;
  site: string | null;
  site_couleur: string | null;
  objet: string | null;
  debut: string;
  fin: string;
  heures: number;
  lot_id: string | null;
  motif_forcage: string | null;
  en_chevauchement: boolean;
}

export interface Lot {
  lot_id: string | null;
  posees: Affectation[];
  refusees: {
    ressource?: string;
    debut?: string;
    raison: { message?: string; conflits?: ConflitLigne[]; forcage_possible?: boolean };
  }[];
}

export interface ConflitLigne {
  affectation_id: number;
  planning: string | null;
  ressource: string | null;
  site: string | null;
  debut: string;
  fin: string;
}

/** Ce que le backend renvoie en 409 quand une ressource est déjà prise. */
export interface Conflit {
  message: string;
  conflits: ConflitLigne[];
  forcage_possible: boolean;
}

export interface Charge {
  ressource_id: number;
  ressource: string;
  type: TypePlanning;
  prestations: number;
  heures: number;
  avertissements: string[];
}

export interface Occupation {
  site_id: number;
  site: string;
  ressources: number;
  prestations: number;
  heures: number;
}

export type StatutReservation = "DEMANDEE" | "ACCEPTEE" | "REFUSEE";

export interface Salle {
  id: number;
  libelle: string;
  capacite: number | null;
  categorie: string | null;
  active: boolean;
  attributs: Record<string, unknown>;
}

export interface Reservation {
  id: number;
  salle_id: number;
  salle: string | null;
  capacite: number | null;
  objet: string | null;
  debut: string;
  fin: string;
  heures: number;
  statut: StatutReservation;
  demandeur_user_id: number | null;
  demandeur: string | null;
  decide_le: string | null;
  motif_decision: string | null;
  motif_forcage: string | null;
  en_chevauchement: boolean;
}

export interface OccupationSalles {
  fenetre: {
    depuis: string; jusqu_a: string;
    jours_ouvres: number; heures_ouvrables: number;
    /** Le dénominateur du taux, en toutes lettres — un pourcentage dont on
     *  ignore la base ne veut rien dire. */
    plage: string;
  };
  totaux: {
    salles: number; occupees: number; heures: number;
    en_attente: number; refusees: number; taux_moyen: number;
  };
  salles: {
    id: number; nom: string; capacite: number | null; active: boolean;
    categorie: string | null; reservations: number; heures: number;
    taux: number; en_attente: number; refusees: number;
  }[];
}

// ── Notes et incidents ──────────────────────────────────────────────────────

export type SujetNote = "RESERVATION" | "USAGE_GROUPE";
export type NatureNote = "NOTE" | "INCIDENT";

export interface NoteOperations {
  id: number;
  sujet_type: SujetNote;
  sujet_id: number;
  nature: NatureNote;
  contenu: string;
  /** Une observation naît close ; un incident naît ouvert. */
  statut: "OUVERT" | "CLOTURE";
  auteur: string | null;
  auteur_user_id: number | null;
  cree_le: string | null;
  cloture_le: string | null;
  cloture_par: string | null;
  resolution: string | null;
  sujet: { libelle: string | null; debut: string; fin: string | null } | null;
}

// ── Groupes électrogènes ────────────────────────────────────────────────────

export interface GroupeElectrogene {
  id: number;
  nom: string;
  reference: string | null;
  capacite: number | null;
  categorie: string | null;
  attributs: Record<string, unknown>;
  active: boolean;
  en_marche: boolean;
  depuis: string | null;
  usage_ouvert_id: number | null;
  carburant_recu: number;
}

export interface UsageGroupe {
  id: number;
  ressource_id: number;
  groupe: string | null;
  debut: string;
  fin: string | null;
  en_cours: boolean;
  heures: number;
  motif: string | null;
  demarre_par: string | null;
  arrete_par: string | null;
}

export interface Carburant {
  /** Déduit des mouvements, jamais saisi. */
  reserve: number;
  mouvements: {
    id: number;
    source: "FOURNISSEUR" | "RESERVE";
    destination: "RESERVE" | "GROUPE";
    ressource_id: number | null;
    groupe: string | null;
    quantite: number;
    date: string;
    fournisseur: string | null;
    note: string | null;
    saisi_par: string | null;
  }[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

/** Erreur portant le détail structuré d'un chevauchement.
 *
 *  Un `409` n'est pas un échec ordinaire : il dit « cette ressource est déjà
 *  prise, voici où, et voici si vous pouvez passer outre ». L'écran a besoin de
 *  ce détail pour proposer la justification plutôt qu'un message d'erreur sec. */
export class ConflitError extends Error {
  conflit: Conflit;
  constructor(conflit: Conflit) {
    super(conflit.message);
    this.name = "ConflitError";
    this.conflit = conflit;
  }
}

async function lire<T>(r: Response): Promise<T> {
  if (r.status === 204) return undefined as T;
  const corps = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = (corps as { detail?: unknown })?.detail;
    if (r.status === 409 && detail && typeof detail === "object" && "conflits" in detail) {
      throw new ConflitError(detail as Conflit);
    }
    const message =
      typeof detail === "string"
        ? detail
        : (detail as { message?: string })?.message ??
          (corps as { message?: string })?.message ??
          `Erreur ${r.status}`;
    throw new Error(message);
  }
  return corps as T;
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join("&")}` : "";
}

// ── Process ────────────────────────────────────────────────────────────────
//
// Une routine à exécuter — une ronde de contrôle — et la trace de ce qu'une
// équipe a réellement fait. Le process et son exécution sont DEUX objets : la
// liste évolue, la ronde d'hier doit rester ce qu'elle était.

/** Le vocabulaire des questions, repris du module Formulaire — un point de
 *  contrôle n'est pas toujours une case à cocher : « les extincteurs sont-ils
 *  en place ? » se coche, « quel est l'index du compteur ? » se relève,
 *  « qu'avez-vous constaté ? » s'écrit. */
export type TypePoint =
  | "CASE"
  | "TEXTE_COURT"
  | "TEXTE_LONG"
  | "NOMBRE"
  | "CHOIX_UNIQUE"
  | "CHOIX_MULTIPLE"
  | "DATE"
  | "HEURE";

export interface PointControle {
  id: number;
  libelle: string;
  aide: string | null;
  type: TypePoint;
  type_libelle: string;
  options: string[];
  obligatoire: boolean;
  /** Bornes d'une valeur à relever. Hors bornes = anomalie, jamais un refus :
   *  un relevé aberrant est précisément ce qu'une ronde doit faire remonter. */
  minimum: number | null;
  maximum: number | null;
  unite: string | null;
  position: number;
}

export interface SectionProcess {
  id: number;
  titre: string;
  consigne: string | null;
  position: number;
  points: PointControle[];
}

export type RoleProcess = "CONCEPTEUR" | "EXECUTANT" | "CONSULTATEUR";
export type Visibilite = "WORKSPACE" | "RESTREINTE";

export interface CollaborateurProcess {
  user_id: number;
  nom: string | null;
  role: RoleProcess;
  role_libelle: string;
}

/** Ce que CETTE session peut faire sur ce process, décidé par le serveur.
 *  L'écran ne rejoue pas la règle, il l'affiche — la rejouer en ferait deux,
 *  qui divergeraient au premier ajustement. */
export interface DroitsProcess {
  concevoir: boolean;
  executer: boolean;
  consulter: boolean;
}

export interface MembreEspace {
  id: number;
  user: { id: number; email: string; username: string };
}

export interface GroupeEspace {
  id: number;
  name: string;
  description: string | null;
  member_count?: number;
}

export interface Process {
  id: number;
  nom: string;
  slug: string;
  description: string | null;
  site_id: number | null;
  site_nom: string | null;
  actif: boolean;
  archive_le: string | null;
  archive_par: number | null;
  archive_par_nom: string | null;
  /** Incrémentée à chaque réécriture de la checklist. Elle ne FAIT pas la
   *  cohérence des exécutions passées — chaque réponse porte sa propre copie
   *  de la question — elle la rend lisible : deux rondes aux résultats opposés
   *  peuvent ainsi dire qu'elles n'ont pas contrôlé la même chose. */
  version: number;
  created_by: number | null;
  proprietaire_nom: string | null;
  /** Deux visibilités et non une : « tout le monde passe la ronde, seul le
   *  responsable lit le registre » est le cas courant. */
  visibilite_execution: Visibilite;
  visibilite_execution_libelle: string;
  visibilite_journal: Visibilite;
  visibilite_journal_libelle: string;
  collaborateurs: CollaborateurProcess[];
  /** Les groupes admis, par portée. On stocke leur identifiant et non leurs
   *  membres : une arrivée dans l'équipe hérite de l'accès sans que personne
   *  n'y pense. */
  groupes_execution: number[];
  groupes_journal: number[];
  mes_droits: DroitsProcess | null;
  sections: SectionProcess[];
  points: number;
  executions: number;
  derniere_execution_le: string | null;
}

export type ValeurPoint = string | number | boolean | string[] | null;

export interface ReponsePoint {
  id: number;
  section_titre: string | null;
  section_consigne: string | null;
  section_position: number;
  point_libelle: string;
  point_aide: string | null;
  type: TypePoint;
  type_libelle: string;
  options: string[];
  obligatoire: boolean;
  minimum: number | null;
  maximum: number | null;
  unite: string | null;
  position: number;
  /** `null` = pas encore répondu. Pour une case, `false` EST une réponse —
   *  « pas fait » se relève, et le confondre avec « pas encore vu » ferait
   *  passer un manquement pour un oubli. */
  valeur: ValeurPoint;
  anomalie: boolean;
  commentaire: string | null;
  repondu_par: number | null;
  repondu_le: string | null;
}

export type StatutExecution = "EN_COURS" | "TERMINEE" | "ABANDONNEE";

export interface ExecutionProcess {
  id: number;
  process_id: number;
  process_nom: string;
  process_version: number;
  statut: StatutExecution;
  statut_libelle: string;
  ouverte_par: number | null;
  ouverte_le: string;
  close_le: string | null;
  close_par: number | null;
  note: string | null;
  points: number;
  repondus: number;
  anomalies: number;
  restants: number;
  reponses: ReponsePoint[];
}

export const operationsApi = {
  types: () => apiFetch("/api/types").then((r) => lire<{ types: TypeDef[] }>(r)),

  // — Ressources —
  ressources: (params: { type?: string; q?: string; actif?: boolean; page?: number } = {}) =>
    apiFetch(`/api/ressources${qs(params)}`).then((r) => lire<Page<Ressource>>(r)),
  creerRessource: (corps: Record<string, unknown>) =>
    apiFetch("/api/ressources", { method: "POST", body: corps }).then((r) => lire<Ressource>(r)),
  modifierRessource: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/ressources/${id}`, { method: "PUT", body: corps }).then((r) =>
      lire<Ressource>(r),
    ),
  supprimerRessource: (id: number) =>
    apiFetch(`/api/ressources/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // — Groupes —
  groupes: (type?: string) =>
    apiFetch(`/api/groupes${qs({ type })}`).then((r) => lire<Groupe[]>(r)),
  creerGroupe: (corps: Record<string, unknown>) =>
    apiFetch("/api/groupes", { method: "POST", body: corps }).then((r) => lire<Groupe>(r)),
  modifierGroupe: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/groupes/${id}`, { method: "PUT", body: corps }).then((r) => lire<Groupe>(r)),
  supprimerGroupe: (id: number) =>
    apiFetch(`/api/groupes/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // — Process —
  process: (params: { q?: string; archives?: boolean; page?: number; page_size?: number } = {}) =>
    apiFetch(`/api/process${qs(params)}`).then((r) => lire<Page<Process>>(r)),
  unProcess: (reference: string) =>
    apiFetch(`/api/process/${reference}`).then((r) => lire<Process>(r)),
  creerProcess: (corps: Record<string, unknown>) =>
    apiFetch("/api/process", { method: "POST", body: corps }).then((r) => lire<Process>(r)),
  modifierProcess: (reference: string, corps: Record<string, unknown>) =>
    apiFetch(`/api/process/${reference}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Process>(r),
    ),
  poserSections: (reference: string, sections: Record<string, unknown>[]) =>
    apiFetch(`/api/process/${reference}/sections`, { method: "PUT", body: sections }).then((r) =>
      lire<Process>(r),
    ),
  poserCollaborateurs: (reference: string, collaborateurs: Record<string, unknown>[]) =>
    apiFetch(`/api/process/${reference}/collaborateurs`, {
      method: "PUT",
      body: collaborateurs,
    }).then((r) => lire<Process>(r)),
  rolesProcess: () =>
    apiFetch("/api/process/roles").then((r) => lire<{ cle: RoleProcess; libelle: string }[]>(r)),
  visibilites: () =>
    apiFetch("/api/process/visibilites").then((r) =>
      lire<{ cle: Visibilite; libelle: string }[]>(r),
    ),
  /** Les groupes RBAC de l'espace — à ne pas confondre avec `groupes`, qui
   *  sont les groupes de ressources de ce module. */
  groupesEspace: (workspaceId: number) =>
    apiFetch(`/api/workspaces/${workspaceId}/groups`).then((r) =>
      lire<{ groups: GroupeEspace[] }>(r),
    ),
  membres: (workspaceId: number) =>
    apiFetch(`/api/workspaces/${workspaceId}/members?limit=200&offset=0`).then((r) =>
      lire<{ members: MembreEspace[]; total: number }>(r),
    ),
  typesPoints: () =>
    apiFetch("/api/process/types-points").then((r) =>
      lire<{ cle: TypePoint; libelle: string }[]>(r),
    ),
  archiverProcess: (reference: string) =>
    apiFetch(`/api/process/${reference}/archiver`, { method: "POST" }).then((r) =>
      lire<Process>(r),
    ),
  restaurerProcess: (reference: string) =>
    apiFetch(`/api/process/${reference}/restaurer`, { method: "POST" }).then((r) =>
      lire<Process>(r),
    ),
  dupliquerProcess: (reference: string, nom?: string) =>
    apiFetch(`/api/process/${reference}/dupliquer`, { method: "POST", body: { nom } }).then((r) =>
      lire<Process>(r),
    ),
  retirerProcess: (reference: string) =>
    apiFetch(`/api/process/${reference}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  executionsDe: (
    reference: string,
    params: { statut?: string; du?: string; au?: string; page?: number } = {},
  ) =>
    apiFetch(`/api/process/${reference}/executions${qs(params)}`).then((r) =>
      lire<Page<ExecutionProcess>>(r),
    ),
  ouvrirExecution: (reference: string) =>
    apiFetch(`/api/process/${reference}/executions`, { method: "POST" }).then((r) =>
      lire<ExecutionProcess>(r),
    ),
  execution: (id: number) =>
    apiFetch(`/api/executions/${id}`).then((r) => lire<ExecutionProcess>(r)),
  repondre: (id: number, reponseId: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/executions/${id}/reponses/${reponseId}`, { method: "PATCH", body: corps }).then(
      (r) => lire<ExecutionProcess>(r),
    ),
  conclureExecution: (id: number, statut: string, note?: string) =>
    apiFetch(`/api/executions/${id}/conclure`, { method: "POST", body: { statut, note } }).then(
      (r) => lire<ExecutionProcess>(r),
    ),
  journalExecutions: (
    params: { q?: string; statut?: string; du?: string; au?: string; page?: number } = {},
  ) => apiFetch(`/api/executions${qs(params)}`).then((r) => lire<Page<ExecutionProcess>>(r)),

  // — Sites —
  sites: (actif?: boolean) => apiFetch(`/api/sites${qs({ actif })}`).then((r) => lire<Site[]>(r)),
  creerSite: (corps: Record<string, unknown>) =>
    apiFetch("/api/sites", { method: "POST", body: corps }).then((r) => lire<Site>(r)),
  modifierSite: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/sites/${id}`, { method: "PUT", body: corps }).then((r) => lire<Site>(r)),
  supprimerSite: (id: number) =>
    apiFetch(`/api/sites/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // — Plannings —
  plannings: (params: { type?: string; statut?: string } = {}) =>
    apiFetch(`/api/plannings${qs(params)}`).then((r) => lire<Planning[]>(r)),
  creerPlanning: (corps: Record<string, unknown>) =>
    apiFetch("/api/plannings", { method: "POST", body: corps }).then((r) => lire<Planning>(r)),
  modifierPlanning: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/plannings/${id}`, { method: "PUT", body: corps }).then((r) => lire<Planning>(r)),
  supprimerPlanning: (id: number) =>
    apiFetch(`/api/plannings/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // — Affectations —
  affectations: (
    params: {
      planning_id?: number;
      ressource_id?: number;
      site_id?: number;
      depuis?: string;
      jusqu_a?: string;
    } = {},
  ) => apiFetch(`/api/affectations${qs(params)}`).then((r) => lire<Affectation[]>(r)),
  /** Rend UNE affectation, ou un LOT si `repetition: "hebdomadaire"` — la
   *  répétition matérialise un créneau par occurrence, et il faut pouvoir dire
   *  combien sont passés et combien ont été refusés. */
  creerAffectation: (corps: Record<string, unknown>) =>
    apiFetch("/api/affectations", { method: "POST", body: corps }).then((r) =>
      lire<Affectation | Lot>(r),
    ),
  modifierAffectation: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/affectations/${id}`, { method: "PUT", body: corps }).then((r) =>
      lire<Affectation>(r),
    ),
  supprimerAffectation: (id: number) =>
    apiFetch(`/api/affectations/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),
  /** Rend hebdomadaire un créneau déjà posé : le créneau d'origine reste le
   *  même, les occurrences manquantes de la période sont ajoutées au lot. */
  repeterAffectation: (id: number) =>
    apiFetch(`/api/affectations/${id}/repeter`, { method: "POST", body: {} }).then((r) =>
      lire<Lot>(r),
    ),
  affecterGroupe: (corps: Record<string, unknown>) =>
    apiFetch("/api/affectations/groupe", { method: "POST", body: corps }).then((r) => lire<Lot>(r)),
  defaireLot: (lotId: string) =>
    apiFetch(`/api/affectations/lot/${lotId}`, { method: "DELETE" }).then((r) =>
      lire<{ retirees: number; origine_gardee: boolean }>(r),
    ),
  dupliquer: (corps: Record<string, unknown>) =>
    apiFetch("/api/affectations/dupliquer", { method: "POST", body: corps }).then((r) =>
      lire<Lot>(r),
    ),
  ouvrirLienReservation: (
    id: number,
    mode: "APPROBATION" | "AUTOMATIQUE",
    delais: { preavis_heures: number | null; horizon_heures: number | null },
  ) =>
    apiFetch(`/api/plannings/${id}/lien-reservation`, {
      method: "POST",
      body: { mode, ...delais },
    }).then(
      (r) => lire<{ url: string; mode: string }>(r),
    ),
  reglerLienReservation: (
    id: number,
    delais: { preavis_heures: number | null; horizon_heures: number | null },
  ) =>
    apiFetch(`/api/plannings/${id}/lien-reservation`, { method: "PUT", body: delais }).then(
      (r) => lire<{ preavis_heures: number | null; horizon_heures: number | null }>(r),
    ),
  /** Tire un NOUVEAU jeton : l'ancienne adresse meurt. Geste à part, parce que
   *  personne n'attend d'une réouverture qu'elle casse une affiche déjà posée. */
  regenererLienReservation: (id: number) =>
    apiFetch(`/api/plannings/${id}/lien-reservation/regenerer`, { method: "POST" }).then((r) =>
      lire<{ url: string; mode: string; suspendue: boolean }>(r),
    ),
  /** Suspend les réservations SANS toucher au lien. */
  suspendreLienReservation: (id: number) =>
    apiFetch(`/api/plannings/${id}/lien-reservation`, { method: "DELETE" }).then((r) =>
      lire<void>(r),
    ),
  rapportPlanning: (id: number) =>
    apiFetch(`/api/plannings/${id}/rapport`).then((r) => lire<RapportPlanning>(r)),
  activiteRessource: (id: number, params: { depuis?: string; jusqu_a?: string } = {}) =>
    apiFetch(`/api/ressources/${id}/activite${qs(params)}`).then((r) =>
      lire<ActiviteRessource>(r),
    ),
  // — Notes et incidents —
  notes: (params: {
    sujet_type?: string; sujet_id?: number; nature?: string; statut?: string;
  } = {}) => apiFetch(`/api/notes${qs(params)}`).then((r) => lire<NoteOperations[]>(r)),
  ajouterNote: (corps: Record<string, unknown>) =>
    apiFetch("/api/notes", { method: "POST", body: corps }).then((r) =>
      lire<NoteOperations>(r),
    ),
  cloturerNote: (id: number, resolution: string) =>
    apiFetch(`/api/notes/${id}/cloture`, { method: "POST", body: { resolution } }).then((r) =>
      lire<NoteOperations>(r),
    ),
  rouvrirNote: (id: number) =>
    apiFetch(`/api/notes/${id}/reouverture`, { method: "POST", body: {} }).then((r) =>
      lire<NoteOperations>(r),
    ),
  supprimerNote: (id: number) =>
    apiFetch(`/api/notes/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // — Groupes électrogènes —
  groupesElectrogenes: () =>
    apiFetch("/api/groupes-electrogenes").then((r) => lire<GroupeElectrogene[]>(r)),
  usagesGroupe: (params: { ressource_id?: number; en_cours?: boolean } = {}) =>
    apiFetch(`/api/groupes-electrogenes/usages${qs(params)}`).then((r) =>
      lire<UsageGroupe[]>(r),
    ),
  demarrerGroupe: (corps: Record<string, unknown>) =>
    apiFetch("/api/groupes-electrogenes/usages", { method: "POST", body: corps }).then((r) =>
      lire<UsageGroupe>(r),
    ),
  arreterGroupe: (id: number, fin?: string | null) =>
    apiFetch(`/api/groupes-electrogenes/usages/${id}/arret`, {
      method: "POST", body: { fin: fin ?? null },
    }).then((r) => lire<UsageGroupe>(r)),
  carburant: () =>
    apiFetch("/api/groupes-electrogenes/carburant").then((r) => lire<Carburant>(r)),
  ravitailler: (corps: Record<string, unknown>) =>
    apiFetch("/api/groupes-electrogenes/carburant", { method: "POST", body: corps }).then((r) =>
      lire<{ id: number; reserve: number }>(r),
    ),
  annulerRavitaillement: (id: number) =>
    apiFetch(`/api/groupes-electrogenes/carburant/${id}`, { method: "DELETE" }).then((r) =>
      lire<void>(r),
    ),

  chevauchements: (planning_id?: number) =>
    apiFetch(`/api/chevauchements${qs({ planning_id })}`).then((r) => lire<Affectation[]>(r)),

  // — Salles et réservations —
  salles: () => apiFetch("/api/salles").then((r) => lire<Salle[]>(r)),
  occupationSalles: (params: { depuis?: string; jusqu_a?: string } = {}) =>
    apiFetch(`/api/salles/occupation${qs(params)}`).then((r) => lire<OccupationSalles>(r)),
  reservations: (
    params: { salle_id?: number; statut?: string; depuis?: string; jusqu_a?: string } = {},
  ) => apiFetch(`/api/reservations${qs(params)}`).then((r) => lire<Reservation[]>(r)),
  reserver: (corps: Record<string, unknown>) =>
    apiFetch("/api/reservations", { method: "POST", body: corps }).then((r) =>
      lire<Reservation>(r),
    ),
  accepter: (id: number, motif?: string) =>
    apiFetch(`/api/reservations/${id}/accepter`, { method: "POST", body: { motif } }).then((r) =>
      lire<Reservation>(r),
    ),
  refuser: (id: number, motif: string) =>
    apiFetch(`/api/reservations/${id}/refuser`, { method: "POST", body: { motif } }).then((r) =>
      lire<Reservation>(r),
    ),
  annulerReservation: (id: number) =>
    apiFetch(`/api/reservations/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // — Vues —
  charge: (reference: string, granularite: "semaine" | "mois", type?: string) =>
    apiFetch(`/api/vues/charge${qs({ reference, granularite, type })}`).then((r) =>
      lire<Charge[]>(r),
    ),
  occupation: (depuis: string, jusqu_a: string) =>
    apiFetch(`/api/vues/occupation${qs({ depuis, jusqu_a })}`).then((r) => lire<Occupation[]>(r)),
};

// ── Aides d'affichage ────────────────────────────────────────────────────────

export const TEINTES_TYPE: Record<TypePlanning, string> = {
  PRESTATION: "#3525cd",
  ESPACE: "#006c49",
  MATERIEL: "#b45309",
  VEHICULE: "#0e7490",
};

export function heureCourte(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function jourCourt(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

/** Le lundi de la semaine contenant cette date — les semaines vont du lundi au
 *  dimanche, comme les plannings de terrain. */
export function lundiDe(d: Date) {
  const copie = new Date(d);
  const decalage = (copie.getDay() + 6) % 7;
  copie.setDate(copie.getDate() - decalage);
  copie.setHours(0, 0, 0, 0);
  return copie;
}

export function isoJour(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
