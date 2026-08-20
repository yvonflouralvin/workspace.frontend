import { apiFetch } from "@repo/network/client";

/** Le client de l'ISP.
 *
 *  Deux origines, et il faut les tenir distinctes : ce qui relève des TRAVAUX
 *  vient de l'ISP ; ce qui relève des étudiants, des promotions et de la
 *  structure vient d'Academia, par son propre BFF. L'ISP ne recopie pas le
 *  socle — elle le consomme.
 */

export interface Directeur {
  id: number;
  unite_id: number;
  enseignant_id: number | null;
  nom: string;
  type_travail: string;
  externe: boolean;
  actif: boolean;
}

export interface Officier {
  id: number;
  unite_id: number;
  annee_id: number;
  user_id: number;
  nom: string;
}

export interface Reglages {
  unite_id: number;
  max_memoires_par_directeur: number | null;
  max_projets_par_directeur: number | null;
  max_membres_par_projet: number | null;
}

export interface Soumission {
  id: number;
  type_travail: string;
  cible_id: number;
  document_id: number;
  nom_fichier: string;
  commentaire: string | null;
  depose_le: string;
}

export interface Memoire {
  id: number;
  etudiant_id: number;
  etudiant_nom: string;
  annee_id: number;
  unite_id: number;
  sujet: string;
  directeur_id: number | null;
  directeur_nom: string;
  statut: string;
  statut_libelle: string;
  motif: string | null;
  soumissions: Soumission[];
}

export interface Projet {
  id: number;
  annee_id: number;
  unite_id: number;
  sujet: string;
  chef_etudiant_id: number;
  chef_nom: string;
  directeur_id: number | null;
  directeur_nom: string;
  statut: string;
  statut_libelle: string;
  motif: string | null;
  membres: number[];
  soumissions: Soumission[];
}

export interface Stage {
  id: number;
  etudiant_id: number;
  etudiant_nom: string;
  annee_id: number;
  unite_id: number;
  type_stage: string;
  institution: string;
  lieu: string | null;
  debut: string | null;
  fin: string | null;
  encadreur: string | null;
  statut: string;
  motif: string | null;
  cote: number | null;
}

export interface Depot {
  id: number;
  unite_id: number;
  nom_complet: string;
  telephone: string;
  sujet: string | null;
  document_id: number;
  nom_fichier: string;
  statut: string;
  created_at: string;
}

async function lire<T>(reponse: Response): Promise<T> {
  if (!reponse.ok) {
    const corps = await reponse.json().catch(() => ({}));
    throw new Error(
      typeof corps?.detail === "string" ? corps.detail : `Erreur ${reponse.status}`
    );
  }
  if (reponse.status === 204) return undefined as T;
  return (await reponse.json()) as T;
}

const base = "/api/isp";

function filtre(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([cle, valeur]) => {
    if (valeur !== undefined && valeur !== null && valeur !== "") query.set(cle, String(valeur));
  });
  return query.toString() ? `?${query}` : "";
}

export const api = {
  directeurs: (params: { unite?: number; type_travail?: string } = {}) =>
    apiFetch(`${base}/directeurs${filtre(params)}`).then((r) => lire<Directeur[]>(r)),
  creerDirecteur: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/directeurs`, { method: "POST", body: corps }).then((r) =>
      lire<Directeur>(r)
    ),
  officiers: (annee?: number) =>
    apiFetch(`${base}/officiers${filtre({ annee })}`).then((r) => lire<Officier[]>(r)),
  designerOfficier: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/officiers`, { method: "PUT", body: corps }).then((r) => lire<Officier>(r)),
  reglages: (unite: number) =>
    apiFetch(`${base}/departements/${unite}/reglages`).then((r) => lire<Reglages>(r)),
  reglerDepartement: (unite: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/departements/${unite}/reglages`, { method: "PUT", body: corps }).then((r) =>
      lire<Reglages>(r)
    ),

  memoires: (params: { unite?: number; annee?: number } = {}) =>
    apiFetch(`${base}/memoires${filtre(params)}`).then((r) => lire<Memoire[]>(r)),
  deposerMemoire: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/memoires`, { method: "POST", body: corps }).then((r) => lire<Memoire>(r)),
  deciderMemoire: (id: number, statut: string, motif?: string) =>
    apiFetch(`${base}/memoires/${id}/decision`, { method: "POST", body: { statut, motif } }).then(
      (r) => lire<Memoire>(r)
    ),
  designerDirecteurMemoire: (id: number, directeur_id: number, etudiant_id: number, sujet: string) =>
    apiFetch(`${base}/memoires/${id}/directeur`, {
      method: "PUT",
      body: { directeur_id, etudiant_id, sujet },
    }).then((r) => lire<Memoire>(r)),

  projets: (params: { unite?: number; annee?: number } = {}) =>
    apiFetch(`${base}/projets-tutores${filtre(params)}`).then((r) => lire<Projet[]>(r)),
  deposerProjet: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/projets-tutores`, { method: "POST", body: corps }).then((r) =>
      lire<Projet>(r)
    ),
  ajouterMembre: (id: number, etudiant_id: number) =>
    apiFetch(`${base}/projets-tutores/${id}/membres`, {
      method: "POST",
      body: { etudiant_id },
    }).then((r) => lire<Projet>(r)),
  deciderProjet: (id: number, statut: string, motif?: string) =>
    apiFetch(`${base}/projets-tutores/${id}/decision`, {
      method: "POST",
      body: { statut, motif },
    }).then((r) => lire<Projet>(r)),

  stages: (params: { unite?: number; annee?: number } = {}) =>
    apiFetch(`${base}/stages${filtre(params)}`).then((r) => lire<Stage[]>(r)),
  declarerStage: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/stages`, { method: "POST", body: corps }).then((r) => lire<Stage>(r)),
  deciderStage: (id: number, statut: string, motif?: string) =>
    apiFetch(`${base}/stages/${id}/decision`, { method: "POST", body: { statut, motif } }).then(
      (r) => lire<Stage>(r)
    ),
  coterStage: (id: number, cote: number) =>
    apiFetch(`${base}/stages/${id}/cote`, { method: "PUT", body: { cote } }).then((r) =>
      lire<Stage>(r)
    ),

  depots: (params: { unite?: number; statut?: string } = {}) =>
    apiFetch(`${base}/depots-memoire${filtre(params)}`).then((r) => lire<Depot[]>(r)),
  statuerDepot: (id: number, statut: string) =>
    apiFetch(`${base}/depots-memoire/${id}/statut`, { method: "PUT", body: { statut } }).then(
      (r) => lire<Depot>(r)
    ),
  fichierDepotUrl: (id: number) => `${base}/depots-memoire/${id}/fichier`,
};

// ── Le socle académique, consommé par son propre BFF ──────────────────────

export interface UniteAcademique {
  id: number;
  libelle: string;
  chemin: string;
  profondeur: number;
  peut_inscrire: boolean;
  type_libelle: string;
}

export interface EtudiantAcademique {
  id: number;
  matricule: string;
  nom_complet: string;
}

export const academia = {
  etablissements: () =>
    apiFetch("/api/academique/etablissements").then((r) =>
      lire<{ id: number; nom: string; sigle: string | null }[]>(r)
    ),
  unites: (etab: number) =>
    apiFetch(`/api/academique/etablissements/${etab}/unites`).then((r) =>
      lire<UniteAcademique[]>(r)
    ),
  annee: (etab: number) =>
    apiFetch(`/api/academique/etablissements/${etab}/moi/annee`).then((r) =>
      lire<{ id: number; libelle: string }>(r)
    ),
  etudiantsDeLUnite: (unite: number, annee?: number) =>
    apiFetch(`/api/academique/unites/${unite}/etudiants${filtre({ annee })}`).then((r) =>
      lire<{ items: EtudiantAcademique[]; total: number }>(r)
    ),
};
