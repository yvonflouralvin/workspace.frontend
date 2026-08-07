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
  attributs: Record<string, unknown>;
  active: boolean;
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
  debut: string;
  fin: string;
  statut: StatutPlanning;
  note: string | null;
  affectations_count: number;
  chevauchements_count: number;
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
  affecterGroupe: (corps: Record<string, unknown>) =>
    apiFetch("/api/affectations/groupe", { method: "POST", body: corps }).then((r) => lire<Lot>(r)),
  defaireLot: (lotId: string) =>
    apiFetch(`/api/affectations/lot/${lotId}`, { method: "DELETE" }).then((r) =>
      lire<{ retirees: number }>(r),
    ),
  dupliquer: (corps: Record<string, unknown>) =>
    apiFetch("/api/affectations/dupliquer", { method: "POST", body: corps }).then((r) =>
      lire<Lot>(r),
    ),
  chevauchements: (planning_id?: number) =>
    apiFetch(`/api/chevauchements${qs({ planning_id })}`).then((r) => lire<Affectation[]>(r)),

  // — Salles et réservations —
  salles: () => apiFetch("/api/salles").then((r) => lire<Salle[]>(r)),
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
