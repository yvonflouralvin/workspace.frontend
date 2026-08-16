import { apiFetch } from "@repo/network/client";

/** Le client d'Academia. Tout passe par le BFF chiffré de l'app. */

export interface Etablissement {
  id: number;
  nom: string;
  sigle: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  actif: boolean;
}

export interface TypeUnite {
  id: number;
  etablissement_id: number;
  cle: string;
  libelle: string;
  parent_type_id: number | null;
  inscriptible_par_defaut: boolean;
  niveaux_par_defaut: string[];
  position: number;
}

export interface Unite {
  id: number;
  etablissement_id: number;
  type_unite_id: number;
  type_libelle: string;
  parent_id: number | null;
  libelle: string;
  code: string | null;
  chemin: string;
  profondeur: number;
  peut_inscrire: boolean;
  niveaux: string[];
  actif: boolean;
  position: number;
}

export interface Annee {
  id: number;
  etablissement_id: number;
  libelle: string;
  debut: string | null;
  fin: string | null;
  etat: "PREPARATION" | "EN_COURS" | "CLOTUREE";
  etat_libelle: string;
  ouverte_le: string | null;
  cloturee_le: string | null;
}

export interface Promotion {
  id: number;
  etablissement_id: number;
  unite_id: number;
  unite_libelle: string;
  unite_chemin: string;
  niveau: string;
  annee_id: number;
  annee_libelle: string;
  libelle: string;
  capacite: number | null;
  actif: boolean;
}

export interface ElementConstitutif {
  id: number;
  unite_enseignement_id: number;
  promotion_id: number;
  intitule: string;
  credits: number;
  cmi: number;
  td: number;
  tp: number;
  volume_total: number;
  titulaire_id: number | null;
  titulaire_nom: string;
  assistant_id: number | null;
  assistant_nom: string;
  assistant_secondaire_id: number | null;
  assistant_secondaire_nom: string;
  est_projet: boolean;
  est_stage: boolean;
  description: string | null;
  contenu_minimum: string | null;
  objectifs: string | null;
  resultats_attendus: string | null;
  position: number;
}

export interface UniteEnseignement {
  id: number;
  promotion_id: number;
  code: string;
  intitule: string;
  periode: number;
  bcc: "FONDAMENTALE" | "TRANSVERSALE" | "DECOUVERTE";
  bcc_libelle: string;
  position: number;
  credits: number;
  cmi: number;
  td: number;
  tp: number;
  nombre_ec: number;
  elements: ElementConstitutif[];
}

export interface Programme {
  promotion_id: number;
  promotion_libelle: string;
  annee_id: number;
  annee_libelle: string;
  annee_modifiable: boolean;
  total_credits: number;
  total_volume: number;
  unites: UniteEnseignement[];
}

export interface Reprise {
  unites: number;
  elements: number;
  ecarts: string[];
}

export interface LigneCharge {
  element_id: number;
  intitule: string;
  code_ue: string;
  intitule_ue: string;
  periode: number;
  promotion_id: number;
  promotion_libelle: string;
  annee_id: number;
  role: "TITULAIRE" | "ASSISTANT" | "ASSISTANT_SECONDAIRE";
  credits: number;
  cmi: number;
  td: number;
  tp: number;
  volume_total: number;
}

export interface ChargeHoraire {
  enseignant_id: number;
  enseignant_nom: string;
  annee_id: number | null;
  total_volume: number;
  total_credits: number;
  lignes: LigneCharge[];
}

export interface Reconduction {
  creees: number;
  ignorees: { promotion: string; raison: string }[];
}

export interface Etudiant {
  id: number;
  etablissement_id: number;
  matricule: string;
  nom: string;
  postnom: string | null;
  prenom: string | null;
  nom_complet: string;
  sexe: string | null;
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  user_id: number | null;
  archive: boolean;
}

export interface EtudiantsPage {
  items: Etudiant[];
  total: number;
  page: number;
  taille: number;
}

export interface RapportImport {
  crees: number;
  ignores: { ligne: number; matricule: string | null; raison: string }[];
}

export interface Inscription {
  id: number;
  etudiant_id: number;
  etudiant_matricule: string;
  etudiant_nom: string;
  promotion_id: number;
  promotion_libelle: string;
  annee_id: number;
  annee_libelle: string;
  statut: "INSCRIT" | "ABANDON" | "EXCLU" | "DIPLOME";
  inscrit_le: string;
  motif: string | null;
  clos_le: string | null;
  niveau: string;
  unite_id: number | null;
  unite_libelle: string;
  unite_chemin: string;
}

export interface Passage {
  inscrits: number;
  ignores: { etudiant: string; matricule: string | null; raison: string }[];
}

export interface Enseignant {
  id: number;
  etablissement_id: number;
  nom: string;
  postnom: string | null;
  prenom: string | null;
  nom_complet: string;
  titre: string | null;
  email: string | null;
  telephone: string | null;
  employee_id: number | null;
  user_id: number | null;
  actif: boolean;
  fonction: string | null;
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

const base = "/api/academique";

export const api = {
  // ── Établissements et structure ────────────────────────────────────────
  etablissements: () => apiFetch(`${base}/etablissements`).then((r) => lire<Etablissement[]>(r)),
  creerEtablissement: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements`, { method: "POST", body: corps }).then((r) =>
      lire<Etablissement>(r)
    ),

  typesUnite: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/types-unite`).then((r) => lire<TypeUnite[]>(r)),
  creerTypeUnite: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/types-unite`, { method: "POST", body: corps }).then(
      (r) => lire<TypeUnite>(r)
    ),

  unites: (etab: number, params: { sous?: number; inscriptibles?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.sous) query.set("sous", String(params.sous));
    if (params.inscriptibles) query.set("inscriptibles", "true");
    const suffixe = query.toString() ? `?${query}` : "";
    return apiFetch(`${base}/etablissements/${etab}/unites${suffixe}`).then((r) =>
      lire<Unite[]>(r)
    );
  },
  creerUnite: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/unites`, { method: "POST", body: corps }).then((r) =>
      lire<Unite>(r)
    ),
  modifierUnite: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/unites/${id}`, { method: "PATCH", body: corps }).then((r) => lire<Unite>(r)),
  supprimerUnite: (id: number) =>
    apiFetch(`${base}/unites/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),

  // ── Années ─────────────────────────────────────────────────────────────
  annees: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/annees`).then((r) => lire<Annee[]>(r)),
  creerAnnee: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/annees`, { method: "POST", body: corps }).then((r) =>
      lire<Annee>(r)
    ),
  ouvrirAnnee: (id: number) =>
    apiFetch(`${base}/annees/${id}/ouvrir`, { method: "POST", body: {} }).then((r) =>
      lire<Annee>(r)
    ),
  cloturerAnnee: (id: number) =>
    apiFetch(`${base}/annees/${id}/cloturer`, { method: "POST", body: {} }).then((r) =>
      lire<Annee>(r)
    ),
  monAnnee: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/moi/annee`).then((r) => lire<Annee>(r)),
  choisirMonAnnee: (etab: number, annee_id: number) =>
    apiFetch(`${base}/etablissements/${etab}/moi/annee`, {
      method: "PUT",
      body: { annee_id },
    }).then((r) => lire<Annee>(r)),

  // ── Promotions ─────────────────────────────────────────────────────────
  promotions: (etab: number, params: { annee?: number; unite?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.annee) query.set("annee", String(params.annee));
    if (params.unite) query.set("unite", String(params.unite));
    const suffixe = query.toString() ? `?${query}` : "";
    return apiFetch(`${base}/etablissements/${etab}/promotions${suffixe}`).then((r) =>
      lire<Promotion[]>(r)
    );
  },
  creerPromotion: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/promotions`, { method: "POST", body: corps }).then(
      (r) => lire<Promotion>(r)
    ),
  modifierPromotion: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/promotions/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Promotion>(r)
    ),
  reconduire: (annee_id: number, depuis_annee_id: number) =>
    apiFetch(`${base}/annees/${annee_id}/reconduire`, {
      method: "POST",
      body: { depuis_annee_id },
    }).then((r) => lire<Reconduction>(r)),

  // ── Étudiants ──────────────────────────────────────────────────────────
  etudiants: (
    etab: number,
    params: { q?: string; page?: number; taille?: number; archives?: boolean } = {}
  ) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.page) query.set("page", String(params.page));
    if (params.taille) query.set("taille", String(params.taille));
    if (params.archives) query.set("archives", "true");
    const suffixe = query.toString() ? `?${query}` : "";
    return apiFetch(`${base}/etablissements/${etab}/etudiants${suffixe}`).then((r) =>
      lire<EtudiantsPage>(r)
    );
  },
  etudiant: (id: number) => apiFetch(`${base}/etudiants/${id}`).then((r) => lire<Etudiant>(r)),
  creerEtudiant: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/etudiants`, { method: "POST", body: corps }).then(
      (r) => lire<Etudiant>(r)
    ),
  modifierEtudiant: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etudiants/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Etudiant>(r)
    ),
  rattacherCompte: (id: number, user_id: number | null) =>
    apiFetch(`${base}/etudiants/${id}/compte`, { method: "PUT", body: { user_id } }).then((r) =>
      lire<Etudiant>(r)
    ),
  importer: (etab: number, lignes: Record<string, unknown>[]) =>
    apiFetch(`${base}/etablissements/${etab}/etudiants/import`, {
      method: "POST",
      body: { lignes },
    }).then((r) => lire<RapportImport>(r)),

  // ── Inscriptions ───────────────────────────────────────────────────────
  inscrire: (etudiant_id: number, promotion_id: number) =>
    apiFetch(`${base}/inscriptions`, {
      method: "POST",
      body: { etudiant_id, promotion_id },
    }).then((r) => lire<Inscription>(r)),
  listeDeClasse: (promotion_id: number, toutes = false) =>
    apiFetch(`${base}/promotions/${promotion_id}/inscriptions${toutes ? "?toutes=true" : ""}`).then(
      (r) => lire<Inscription[]>(r)
    ),
  parcours: (etudiant_id: number) =>
    apiFetch(`${base}/etudiants/${etudiant_id}/parcours`).then((r) => lire<Inscription[]>(r)),
  clore: (id: number, statut: string, motif?: string) =>
    apiFetch(`${base}/inscriptions/${id}/clore`, { method: "POST", body: { statut, motif } }).then(
      (r) => lire<Inscription>(r)
    ),
  passage: (source: number, promotion_cible_id: number) =>
    apiFetch(`${base}/promotions/${source}/passage`, {
      method: "POST",
      body: { promotion_cible_id },
    }).then((r) => lire<Passage>(r)),

  // ── Enseignants ────────────────────────────────────────────────────────
  enseignants: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/enseignants`).then((r) => lire<Enseignant[]>(r)),
  creerEnseignant: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/enseignants`, { method: "POST", body: corps }).then(
      (r) => lire<Enseignant>(r)
    ),
  rattacherEnseignant: (id: number, unite_id: number, fonction?: string) =>
    apiFetch(`${base}/enseignants/${id}/unites`, {
      method: "POST",
      body: { unite_id, fonction },
    }).then((r) => lire<Enseignant>(r)),
  enseignantsDeLUnite: (unite_id: number) =>
    apiFetch(`${base}/unites/${unite_id}/enseignants`).then((r) => lire<Enseignant[]>(r)),

  // ── Programme ──────────────────────────────────────────────────────────
  programme: (promotion_id: number) =>
    apiFetch(`${base}/promotions/${promotion_id}/programme`).then((r) => lire<Programme>(r)),
  creerUE: (promotion_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/promotions/${promotion_id}/unites-enseignement`, {
      method: "POST",
      body: corps,
    }).then((r) => lire<UniteEnseignement>(r)),
  modifierUE: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/unites-enseignement/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<UniteEnseignement>(r)
    ),
  supprimerUE: (id: number, avecElements = false) =>
    apiFetch(
      `${base}/unites-enseignement/${id}${avecElements ? "?avec_elements=true" : ""}`,
      { method: "DELETE" }
    ).then((r) => lire<void>(r)),
  creerEC: (ue_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/unites-enseignement/${ue_id}/elements`, { method: "POST", body: corps }).then(
      (r) => lire<ElementConstitutif>(r)
    ),
  modifierEC: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/elements/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<ElementConstitutif>(r)
    ),
  supprimerEC: (id: number) =>
    apiFetch(`${base}/elements/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),
  reprendreProgramme: (promotion_id: number, source_promotion_id: number, avec_titulaires: boolean) =>
    apiFetch(`${base}/promotions/${promotion_id}/programme/reprendre`, {
      method: "POST",
      body: { source_promotion_id, avec_titulaires },
    }).then((r) => lire<Reprise>(r)),
  chargeHoraire: (enseignant_id: number, annee?: number) =>
    apiFetch(
      `${base}/enseignants/${enseignant_id}/charge-horaire${annee ? `?annee=${annee}` : ""}`
    ).then((r) => lire<ChargeHoraire>(r)),
};
