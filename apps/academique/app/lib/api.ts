import { apiFetch } from "@repo/network/client";

/** Le client d'Academia. Tout passe par le BFF chiffré de l'app. */

export interface Etablissement {
  id: number;
  nom: string;
  sigle: string | null;
  /** Le nom court dans l'URL publique : `/candidature/isp-gombe`. */
  slug: string | null;
  adresse: string | null;
  ville: string | null;
  boite_postale: string | null;
  telephone: string | null;
  email: string | null;
  site_web: string | null;
  rccm: string | null;
  id_national: string | null;
  nif: string | null;
  numero_autorisation: string | null;
  actif: boolean;
}

export interface TypeUnite {
  id: number;
  etablissement_id: number;
  cle: string;
  libelle: string;
  parent_type_id: number | null;
  inscriptible_par_defaut: boolean;
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
  /** L'ascendance en clair, de la racine à l'unité. */
  chemin_libelles: string[];
  profondeur: number;
  peut_inscrire: boolean;
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
  /** L'ascendance de l'unité, de la racine à elle. */
  unite_chemin_libelles: string[];
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

export interface ImportEtudiants {
  id: number;
  etablissement_id: number;
  nom_fichier: string;
  etat: "EN_ATTENTE" | "EN_COURS" | "TERMINE" | "ECHOUE";
  etat_libelle: string;
  total_lignes: number;
  lignes_traitees: number;
  restantes: number;
  crees: number;
  ignores: number;
  message: string | null;
  cree_par: number | null;
  created_at: string;
  demarre_le: string | null;
  termine_le: string | null;
}

export interface LigneImport {
  ligne: number;
  statut: string;
  matricule: string | null;
  nom: string | null;
  raison: string;
}

export interface LignesImportPage {
  items: LigneImport[];
  total: number;
  page: number;
  taille: number;
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
  modifierEtablissement: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${id}`, { method: "PATCH", body: corps }).then((r) =>
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
  /** Une promotion par son identifiant — l'écran n'a plus à la chercher dans la
   *  liste de l'établissement mémorisé côté navigateur. */
  promotion: (id: number) => apiFetch(`${base}/promotions/${id}`).then((r) => lire<Promotion>(r)),
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

  /** Ouvrir l'année depuis la STRUCTURE : une promotion par unité qui inscrit.
   *
   *  L'autre geste de rentrée. Reconduire recopie l'année passée — ses
   *  capacités, ses libellés retouchés ; celui-ci suit ce que l'établissement a
   *  décidé depuis, et sert la première année, qui n'a rien à reconduire. */
  ouvrirDepuisStructure: (annee_id: number) =>
    apiFetch(`${base}/annees/${annee_id}/ouvrir-depuis-structure`, { method: "POST" }).then(
      (r) => lire<Reconduction>(r)
    ),

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
  // ── Import d'un fichier ────────────────────────────────────────────────
  // Octets bruts : le classeur ne survit pas au chiffrement JSON du relais
  // générique. Le téléversement passe par XHR et non `fetch`, parce que seul
  // XHR sait dire OÙ EN EST l'envoi — un fichier de dix mille lignes met
  // plusieurs secondes à monter, et une barre figée passe pour une panne.
  deposerImport: (
    etab: number,
    fichier: File,
    onProgres?: (pourcent: number) => void
  ): Promise<ImportEtudiants> =>
    new Promise((resoudre, rejeter) => {
      const form = new FormData();
      form.append("fichier", fichier);
      const requete = new XMLHttpRequest();
      requete.open("POST", `/api/academique-fichiers/etablissements/${etab}/etudiants/imports`);
      requete.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgres) onProgres(Math.round((e.loaded / e.total) * 100));
      };
      requete.onload = () => {
        let corps: { detail?: string } & ImportEtudiants;
        try {
          corps = JSON.parse(requete.responseText);
        } catch {
          rejeter(new Error(`Erreur ${requete.status}`));
          return;
        }
        if (requete.status >= 200 && requete.status < 300) resoudre(corps);
        else rejeter(new Error(corps?.detail ?? `Erreur ${requete.status}`));
      };
      requete.onerror = () => rejeter(new Error("Le téléversement a été interrompu."));
      requete.send(form);
    }),
  imports: (etab: number, limite = 10) =>
    apiFetch(`${base}/etablissements/${etab}/etudiants/imports?limite=${limite}`).then((r) =>
      lire<ImportEtudiants[]>(r)
    ),
  suivreImport: (id: number) =>
    apiFetch(`${base}/etudiants/imports/${id}`).then((r) => lire<ImportEtudiants>(r)),
  journalImport: (id: number, page = 1, taille = 50) =>
    apiFetch(`${base}/etudiants/imports/${id}/lignes?page=${page}&taille=${taille}`).then((r) =>
      lire<LignesImportPage>(r)
    ),
  modeleImportUrl: (etab: number) =>
    `/api/academique-fichiers/etablissements/${etab}/etudiants/imports/modele`,

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

  // ── C2 : périodes, réglages, vannes ─────────────────────────────────────
  periodes: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/periodes`).then((r) => lire<Periode[]>(r)),
  nommerPeriode: (etab: number, rang: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/periodes/${rang}`, { method: "PUT", body: corps }).then(
      (r) => lire<Periode>(r)
    ),
  sessions: () => apiFetch(`${base}/sessions`).then((r) => lire<SessionEvaluation[]>(r)),
  parametres: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/parametres`).then((r) => lire<Parametre[]>(r)),
  ecrireParametre: (etab: number, cle: string, valeur: string) =>
    apiFetch(`${base}/etablissements/${etab}/parametres/${cle}`, {
      method: "PUT",
      body: { valeur },
    }).then((r) => lire<Parametre>(r)),
  vannes: (promotion_id: number) =>
    apiFetch(`${base}/promotions/${promotion_id}/vannes`).then((r) => lire<Vanne[]>(r)),
  basculerVanne: (promotion_id: number, cle: string, ouverte: boolean, motif?: string) =>
    apiFetch(`${base}/promotions/${promotion_id}/vannes/${cle}`, {
      method: "PUT",
      body: { ouverte, motif },
    }).then((r) => lire<Vanne[]>(r)),

  // ── C3 : cotes ──────────────────────────────────────────────────────────
  ficheCotation: (element_id: number, session = "NORMALE") =>
    apiFetch(`${base}/elements/${element_id}/cotation?session=${session}`).then((r) =>
      lire<FicheCotation>(r)
    ),
  saisirCotes: (element_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/elements/${element_id}/cotation`, { method: "PUT", body: corps }).then((r) =>
      lire<BilanSaisie>(r)
    ),
  envoyerAuJury: (element_id: number, session: string) =>
    apiFetch(`${base}/elements/${element_id}/cotation/envoyer-au-jury`, {
      method: "POST",
      body: { session, lignes: [] },
    }).then((r) => lire<BilanSaisie>(r)),
  rouvrirCotation: (element_id: number, session: string, motif: string) =>
    apiFetch(`${base}/elements/${element_id}/cotation/rouvrir`, {
      method: "POST",
      body: { session, motif },
    }).then((r) => lire<BilanSaisie>(r)),
  auditCotes: (etudiant_id: number) =>
    apiFetch(`${base}/etudiants/${etudiant_id}/audit-cotes`).then((r) => lire<AuditCotes>(r)),
  resultats: (etudiant_id: number) =>
    apiFetch(`${base}/etudiants/${etudiant_id}/resultats`).then((r) => lire<ParcoursResultats>(r)),

  // ── C4 : examens ────────────────────────────────────────────────────────
  planningExamens: (promotion_id: number, session = "NORMALE") =>
    apiFetch(`${base}/promotions/${promotion_id}/examens?session=${session}`).then((r) =>
      lire<Planning>(r)
    ),
  creerExamen: (promotion_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/promotions/${promotion_id}/examens`, { method: "POST", body: corps }).then(
      (r) => lire<Examen>(r)
    ),
  modifierExamen: (examen_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/examens/${examen_id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Examen>(r)
    ),
  supprimerExamen: (examen_id: number, avecPresences = false) =>
    apiFetch(
      `${base}/examens/${examen_id}${avecPresences ? "?avec_presences=true" : ""}`,
      { method: "DELETE" }
    ).then((r) => lire<void>(r)),
  genererExamens: (promotion_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/promotions/${promotion_id}/examens/generer`, {
      method: "POST",
      body: corps,
    }).then((r) => lire<BilanExamens>(r)),
  copierExamens: (promotion_id: number, source: string, cible: string) =>
    apiFetch(`${base}/promotions/${promotion_id}/examens/copier`, {
      method: "POST",
      body: { source, cible },
    }).then((r) => lire<BilanExamens>(r)),
  deposerQuestionnaire: (examen_id: number, manuel: boolean, note?: string) =>
    apiFetch(`${base}/examens/${examen_id}/questionnaire`, {
      method: "POST",
      body: { manuel, note },
    }).then((r) => lire<Examen>(r)),
  feuillePresence: (examen_id: number) =>
    apiFetch(`${base}/examens/${examen_id}/presences`).then((r) => lire<FeuillePresence>(r)),
  pointer: (examen_id: number, lignes: Record<string, unknown>[]) =>
    apiFetch(`${base}/examens/${examen_id}/presences`, { method: "PUT", body: { lignes } }).then(
      (r) => lire<BilanExamens>(r)
    ),

  // ── C5 : délibération ───────────────────────────────────────────────────
  mentions: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/mentions`).then((r) => lire<Mention[]>(r)),
  ecrireMentions: (etab: number, lignes: { libelle: string; seuil: number }[]) =>
    apiFetch(`${base}/etablissements/${etab}/mentions`, { method: "PUT", body: lignes }).then((r) =>
      lire<Mention[]>(r)
    ),
  grille: (promotion_id: number, session = "NORMALE", periode = 0) =>
    apiFetch(
      `${base}/promotions/${promotion_id}/grille?session=${session}&periode=${periode}`
    ).then((r) => lire<Grille>(r)),
  cloturerDeliberation: (promotion_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/promotions/${promotion_id}/deliberation/cloturer`, {
      method: "POST",
      body: corps,
    }).then((r) => lire<Deliberation>(r)),
  rouvrirDeliberation: (deliberation_id: number) =>
    apiFetch(`${base}/deliberations/${deliberation_id}/rouvrir`, { method: "POST" }).then((r) =>
      lire<Deliberation>(r)
    ),
  palmares: (promotion_id: number, session = "NORMALE", periode = 0) =>
    apiFetch(
      `${base}/promotions/${promotion_id}/palmares?session=${session}&periode=${periode}`
    ).then((r) => lire<Palmares>(r)),

  // ── C6 : recours ────────────────────────────────────────────────────────
  tableauRecours: (promotion_id: number, session = "NORMALE") =>
    apiFetch(`${base}/promotions/${promotion_id}/recours/tableau?session=${session}`).then((r) =>
      lire<TableauRecours>(r)
    ),
  recours: (promotion_id: number, session = "NORMALE", element?: number) =>
    apiFetch(
      `${base}/promotions/${promotion_id}/recours?session=${session}` +
        (element ? `&element=${element}` : "")
    ).then((r) => lire<Recours[]>(r)),
  deposerRecours: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/recours`, { method: "POST", body: corps }).then((r) => lire<Recours>(r)),
  deciderRecours: (recours_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/recours/${recours_id}/decision`, { method: "POST", body: corps }).then((r) =>
      lire<Recours>(r)
    ),
  deciderRecoursEnMasse: (promotion_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/promotions/${promotion_id}/recours/decision-masse`, {
      method: "POST",
      body: corps,
    }).then((r) => lire<BilanRecours>(r)),

  // ── C7 : frais ──────────────────────────────────────────────────────────
  typesFrais: (etab: number) =>
    apiFetch(`${base}/etablissements/${etab}/types-frais`).then((r) => lire<TypeFrais[]>(r)),
  creerTypeFrais: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/types-frais`, { method: "POST", body: corps }).then(
      (r) => lire<TypeFrais>(r)
    ),
  poserTarif: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/tarifs`, { method: "PUT", body: corps }).then((r) =>
      lire<{ id: number; montant: number }>(r)
    ),
  rapportFrais: (promotion_id: number) =>
    apiFetch(`${base}/promotions/${promotion_id}/frais`).then((r) => lire<RapportFrais>(r)),
  situationFrais: (inscription_id: number) =>
    apiFetch(`${base}/inscriptions/${inscription_id}/frais`).then((r) => lire<SituationFrais>(r)),
  paiements: (inscription_id: number) =>
    apiFetch(`${base}/inscriptions/${inscription_id}/paiements`).then((r) => lire<Paiement[]>(r)),
  constaterPaiement: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/paiements`, { method: "POST", body: corps }).then((r) => lire<Paiement>(r)),
  annulerPaiement: (paiement_id: number, motif: string) =>
    apiFetch(`${base}/paiements/${paiement_id}/annuler`, { method: "POST", body: { motif } }).then(
      (r) => lire<Paiement>(r)
    ),
  exonerer: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/exonerations`, { method: "POST", body: corps }).then((r) =>
      lire<{ id: number }>(r)
    ),

  // ── C8 : candidatures ───────────────────────────────────────────────────
  //
  // Les trois routes `public*` sont les SEULES d'Academia joignables sans
  // compte. Elles passent par le même BFF chiffré : le relais transmet le
  // cookie s'il y en a un, et le backend ne le regarde pas.
  /** `reference` est le NOM COURT de l'établissement, ou son identifiant : un
   *  lien déjà imprimé ne se rappelle pas. */
  ouvertureCandidatures: (reference: string | number) =>
    apiFetch(
      `${base}/public/candidatures/ouverture?etablissement=${encodeURIComponent(String(reference))}`
    ).then((r) => lire<OuvertureCandidatures>(r)),
  deposerCandidature: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/public/candidatures`, { method: "POST", body: corps }).then((r) =>
      lire<RecuCandidature>(r)
    ),
  suivreCandidature: (reference: string, annee: number) =>
    apiFetch(
      `${base}/public/candidatures/suivi?reference=${encodeURIComponent(reference)}&annee=${annee}`
    ).then((r) => lire<SuiviCandidature>(r)),

  candidatures: (etab: number, annee: number, filtres: Record<string, string> = {}) => {
    const q = new URLSearchParams({ annee: String(annee), ...filtres });
    return apiFetch(`${base}/etablissements/${etab}/candidatures?${q}`).then((r) =>
      lire<Candidature[]>(r)
    );
  },
  tableauCandidatures: (etab: number, annee: number) =>
    apiFetch(`${base}/etablissements/${etab}/candidatures/tableau?annee=${annee}`).then((r) =>
      lire<TableauCandidatures>(r)
    ),
  deciderCandidature: (id: number, statut: string, motif?: string) =>
    apiFetch(`${base}/candidatures/${id}/decision`, { method: "POST", body: { statut, motif } }).then(
      (r) => lire<Candidature>(r)
    ),
  marquerDossier: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/candidatures/${id}/dossier`, { method: "PATCH", body: corps }).then((r) =>
      lire<Candidature>(r)
    ),
  deciderCandidaturesEnMasse: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/candidatures/decision-masse`, {
      method: "POST",
      body: corps,
    }).then((r) => lire<BilanCandidatures>(r)),
  transfererCandidature: (id: number, promotion_id: number) =>
    apiFetch(`${base}/candidatures/${id}/transferer`, { method: "POST", body: { promotion_id } }).then(
      (r) => lire<Transfert>(r)
    ),
  restrictions: (etab: number, annee: number) =>
    apiFetch(`${base}/etablissements/${etab}/restrictions-inscription?annee=${annee}`).then((r) =>
      lire<Restriction[]>(r)
    ),
  poserRestriction: (etab: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/etablissements/${etab}/restrictions-inscription`, {
      method: "POST",
      body: corps,
    }).then((r) => lire<Restriction>(r)),
  leverRestriction: (id: number) =>
    apiFetch(`${base}/restrictions-inscription/${id}`, { method: "DELETE" }).then((r) =>
      lire<void>(r)
    ),

  // ── C9 : défenses ───────────────────────────────────────────────────────
  criteresDefense: (etab: number, unite?: number) =>
    apiFetch(
      `${base}/etablissements/${etab}/criteres-defense` + (unite ? `?unite=${unite}` : "")
    ).then((r) => lire<CritereDefense[]>(r)),
  ecrireCriteresDefense: (
    etab: number,
    lignes: { libelle: string; pourcentage: number }[],
    unite?: number
  ) =>
    apiFetch(
      `${base}/etablissements/${etab}/criteres-defense` + (unite ? `?unite=${unite}` : ""),
      { method: "PUT", body: lignes }
    ).then((r) => lire<CritereDefense[]>(r)),
  defenses: (promotion_id: number) =>
    apiFetch(`${base}/promotions/${promotion_id}/defenses`).then((r) => lire<Defense[]>(r)),
  defense: (id: number) => apiFetch(`${base}/defenses/${id}`).then((r) => lire<Defense>(r)),
  planifierDefense: (corps: Record<string, unknown>) =>
    apiFetch(`${base}/defenses`, { method: "POST", body: corps }).then((r) => lire<Defense>(r)),
  constituerJury: (id: number, membres: { enseignant_id: number; role: string }[]) =>
    apiFetch(`${base}/defenses/${id}/jury`, { method: "PUT", body: { membres } }).then((r) =>
      lire<Defense>(r)
    ),
  deleguerJure: (jure_id: number, remplacant_id: number, motif: string) =>
    apiFetch(`${base}/jures/${jure_id}/deleguer`, {
      method: "POST",
      body: { remplacant_id, motif },
    }).then((r) => lire<Defense>(r)),
  ouvrirCotationDefense: (id: number) =>
    apiFetch(`${base}/defenses/${id}/cotation/ouvrir`, { method: "POST" }).then((r) =>
      lire<Defense>(r)
    ),
  coterDefense: (id: number, notes: Record<string, number>) =>
    apiFetch(`${base}/defenses/${id}/cotation`, { method: "PUT", body: { notes } }).then((r) =>
      lire<ResultatDefense>(r)
    ),
  cloreCotationDefense: (id: number) =>
    apiFetch(`${base}/defenses/${id}/cotation/clore`, { method: "POST" }).then((r) =>
      lire<Defense>(r)
    ),
  proclamerDefense: (id: number) =>
    apiFetch(`${base}/defenses/${id}/proclamer`, { method: "POST" }).then((r) => lire<Defense>(r)),

  // ── C10 : projets ───────────────────────────────────────────────────────
  projet: (inscription_id: number) =>
    apiFetch(`${base}/inscriptions/${inscription_id}/projet`).then((r) => lire<Projet>(r)),
  projets: (promotion_id: number) =>
    apiFetch(`${base}/promotions/${promotion_id}/projets`).then((r) => lire<Projet[]>(r)),
  suiviProjets: (promotion_id: number) =>
    apiFetch(`${base}/promotions/${promotion_id}/projets/suivi`).then((r) => lire<SuiviProjets>(r)),
  ecrireSujet: (projet_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/projets/${projet_id}/sujet`, { method: "PATCH", body: corps }).then((r) =>
      lire<Projet>(r)
    ),
  soumettreSujet: (projet_id: number) =>
    apiFetch(`${base}/projets/${projet_id}/sujet/soumettre`, { method: "POST" }).then((r) =>
      lire<Projet>(r)
    ),
  deciderSujet: (projet_id: number, approuve: boolean, motif?: string) =>
    apiFetch(`${base}/projets/${projet_id}/sujet/decision`, {
      method: "POST",
      body: { approuve, motif },
    }).then((r) => lire<Projet>(r)),
  rouvrirSujet: (projet_id: number, motif: string) =>
    apiFetch(`${base}/projets/${projet_id}/sujet/rouvrir`, { method: "POST", body: { motif } }).then(
      (r) => lire<Projet>(r)
    ),
  attribuerEncadrement: (projet_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/projets/${projet_id}/encadrement`, { method: "PUT", body: corps }).then((r) =>
      lire<Projet>(r)
    ),
  deposerMemoire: (projet_id: number, nom: string, reference: string) =>
    apiFetch(`${base}/projets/${projet_id}/fichier`, { method: "POST", body: { nom, reference } }).then(
      (r) => lire<Projet>(r)
    ),
  deposerPlagiat: (projet_id: number, taux: number, reference?: string) =>
    apiFetch(`${base}/projets/${projet_id}/plagiat`, { method: "POST", body: { taux, reference } }).then(
      (r) => lire<Projet>(r)
    ),

  // ── C14 : séances ───────────────────────────────────────────────────────
  seances: (promotion_id: number, du?: string, au?: string) => {
    const q = new URLSearchParams();
    if (du) q.set("du", du);
    if (au) q.set("au", au);
    return apiFetch(`${base}/promotions/${promotion_id}/seances?${q}`).then((r) =>
      lire<Seance[]>(r)
    );
  },
  agendaEnseignant: (enseignant_id: number, du?: string, au?: string) => {
    const q = new URLSearchParams();
    if (du) q.set("du", du);
    if (au) q.set("au", au);
    return apiFetch(`${base}/enseignants/${enseignant_id}/seances?${q}`).then((r) =>
      lire<Seance[]>(r)
    );
  },
  creerSeance: (promotion_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/promotions/${promotion_id}/seances`, { method: "POST", body: corps }).then(
      (r) => lire<Seance>(r)
    ),
  changerStatutSeance: (seance_id: number, corps: Record<string, unknown>) =>
    apiFetch(`${base}/seances/${seance_id}/statut`, { method: "PATCH", body: corps }).then((r) =>
      lire<Seance>(r)
    ),
  supprimerSeance: (seance_id: number) =>
    apiFetch(`${base}/seances/${seance_id}`, { method: "DELETE" }).then((r) => lire<void>(r)),
};

// ────────────────────────────────────────────────────────────────────────────
// Reprise CISNET — lots C2 à C14. Les types suivent les schémas du service ;
// chaque famille garde son bloc pour rester lisible à la relecture.
// ────────────────────────────────────────────────────────────────────────────

// ── C2 : périodes, réglages, vannes ───────────────────────────────────────
export interface Periode {
  id: number;
  etablissement_id: number;
  rang: number;
  libelle: string;
  abrege: string | null;
  actif: boolean;
}

export interface SessionEvaluation {
  cle: string;
  libelle: string;
}

export interface Parametre {
  cle: string;
  libelle: string;
  description: string;
  groupe: string;
  type: "entier" | "booleen" | "texte";
  defaut: string;
  valeur: string;
  personnalise: boolean;
}

export interface Vanne {
  cle: string;
  libelle: string;
  ouverte: boolean;
  change_le: string | null;
  change_par: number | null;
  motif: string | null;
  /** Vraie quand le gel général la neutralise : la vanne est ouverte en propre,
   *  mais elle ne laisse plus rien passer. On ne dit pas « fermée ». */
  neutralisee_par_le_gel: boolean;
}

// ── C3 : cotes ────────────────────────────────────────────────────────────
export interface LigneCotation {
  inscription_id: number;
  etudiant_id: number;
  matricule: string;
  nom_complet: string;
  note_travaux: number | null;
  note_examen: number | null;
  non_delibere: boolean;
  total: number | null;
  total_arrete: number | null;
  /** « Saisi » distingue une cote posée d'une cote absente. Le confondre avec
   *  ND ferait échouer un étudiant qu'on a seulement oublié de coter. */
  saisie: boolean;
  envoye_au_jury: boolean;
  saisi_le: string | null;
  saisi_par: number | null;
}

export interface FicheCotation {
  element_id: number;
  intitule: string;
  code_ue: string;
  intitule_ue: string;
  promotion_id: number;
  promotion_libelle: string;
  annee_libelle: string;
  session: string;
  session_libelle: string;
  bareme_travaux: number;
  bareme_examen: number;
  bareme_total: number;
  encodage_ouvert: boolean;
  peut_saisir: boolean;
  peut_gerer: boolean;
  remise_au_jury: boolean;
  lignes: LigneCotation[];
}

export interface BilanSaisie {
  ecrites: number;
  inchangees: number;
  refusees: string[];
}

export interface LigneAudit {
  element_id: number;
  element_intitule: string;
  code_ue: string;
  session: string;
  avant: string;
  apres: string;
  contexte: string;
  motif: string | null;
  par: number | null;
  le: string;
}

/** Une décision ARRÊTÉE, telle qu'elle a été figée le jour de la délibération. */
export interface ResultatAnnee {
  deliberation_id: number;
  promotion_id: number;
  promotion_libelle: string;
  annee_libelle: string;
  session: string;
  session_libelle: string;
  periode: number;
  close_le: string;
  credits_acquis: number;
  credits_totaux: number;
  moyenne: number | null;
  mention: string | null;
  decision: string;
  decision_libelle: string;
}

export interface ParcoursResultats {
  etudiant_id: number;
  nom_complet: string;
  matricule: string;
  credits_cumules: number;
  annees: ResultatAnnee[];
}

export interface AuditCotes {
  etudiant_id: number;
  nom_complet: string;
  matricule: string;
  editions: number;
  lignes: LigneAudit[];
}

// ── C4 : examens ──────────────────────────────────────────────────────────
export interface Examen {
  id: number;
  promotion_id: number;
  element_id: number;
  element_intitule: string;
  code_ue: string;
  periode: number;
  session: string;
  session_libelle: string;
  intitule: string | null;
  titre: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  auditoire_id: number | null;
  est_oral: boolean;
  titulaire_id: number | null;
  titulaire_nom: string;
  questionnaire_attendu: boolean;
  questionnaire_depose_le: string | null;
  questionnaire_manuel: boolean;
  inscrits: number;
  pointes: number;
  presents: number;
}

export interface Planning {
  promotion_id: number;
  promotion_libelle: string;
  annee_libelle: string;
  session: string;
  session_libelle: string;
  /** Les EC sans épreuve : un planning qui ne montrerait que ce qu'il contient
   *  laisserait croire qu'il est complet. */
  elements_sans_examen: string[];
  examens: Examen[];
}

export interface LignePresence {
  inscription_id: number;
  etudiant_id: number;
  matricule: string;
  nom_complet: string;
  statut: string | null;
  statut_libelle: string;
  observation: string | null;
  pointe_le: string | null;
  pointe_par: number | null;
}

export interface FeuillePresence {
  examen_id: number;
  titre: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  inscrits: number;
  pointes: number;
  presents: number;
  lignes: LignePresence[];
}

export interface BilanExamens {
  crees: number;
  ignores: string[];
}

// ── C5 : délibération ─────────────────────────────────────────────────────
export interface Mention {
  id: number;
  libelle: string;
  seuil: number;
  personnalise: boolean;
}

export interface LigneElementGrille {
  element_id: number;
  intitule: string;
  credits: number;
  total: number | null;
  non_delibere: boolean;
  valide: boolean;
  manquante: boolean;
}

export interface LigneUniteGrille {
  unite_id: number;
  code: string;
  intitule: string;
  periode: number;
  bcc: string;
  credits: number;
  moyenne: number | null;
  valide: boolean;
  credits_acquis: number;
  elements: LigneElementGrille[];
}

export interface LigneEtudiantGrille {
  inscription_id: number;
  etudiant_id: number;
  matricule: string;
  nom_complet: string;
  credits_acquis: number;
  credits_totaux: number;
  moyenne: number | null;
  mention: string | null;
  decision: string;
  decision_libelle: string;
  decision_abrege: string;
  elements_a_reprendre: string[];
  manquants: string[];
  unites: LigneUniteGrille[];
}

export interface Grille {
  promotion_id: number;
  promotion_libelle: string;
  annee_libelle: string;
  session: string;
  session_libelle: string;
  periode: number;
  seuil_validation: number;
  compensation_ue: boolean;
  credits_requis: number;
  deliberation_id: number | null;
  close_le: string | null;
  etudiants_incomplets: number;
  lignes: LigneEtudiantGrille[];
}

export interface Deliberation {
  id: number;
  promotion_id: number;
  session: string;
  periode: number;
  close_le: string | null;
  close_par: number | null;
  proces_verbal: string | null;
  seuil_validation: number;
  credits_requis: number;
  compensation_ue: boolean;
  decisions: number;
}

export interface SyntheseLigne {
  cle: string;
  libelle: string;
  effectif: number;
  pourcentage: number;
}

export interface Palmares {
  promotion_id: number;
  promotion_libelle: string;
  annee_libelle: string;
  session: string;
  periode: number;
  close_le: string;
  proces_verbal: string | null;
  effectif: number;
  par_decision: SyntheseLigne[];
  par_mention: SyntheseLigne[];
  lignes: LigneEtudiantGrille[];
}

// ── C6 : recours ──────────────────────────────────────────────────────────
export interface Recours {
  id: number;
  inscription_id: number;
  etudiant_id: number;
  matricule: string;
  nom_complet: string;
  element_id: number;
  element_intitule: string;
  code_ue: string;
  promotion_id: number;
  session: string;
  motif: string;
  cote_avant: number | null;
  cote_avant_nd: boolean;
  statut: "DEPOSE" | "ACCEPTE" | "REFUSE";
  statut_libelle: string;
  cote_apres: number | null;
  justification: string | null;
  depose_le: string;
  depose_par: number | null;
  decide_le: string | null;
  decide_par: number | null;
}

export interface LigneRecoursParCours {
  element_id: number;
  element_intitule: string;
  code_ue: string;
  titulaire_nom: string;
  en_attente: number;
  acceptes: number;
  refuses: number;
}

export interface TableauRecours {
  promotion_id: number;
  promotion_libelle: string;
  session: string;
  session_libelle: string;
  /** Deux vannes distinctes : afficher un seul état ferait croire qu'on ne peut
   *  pas traiter parce que le dépôt est fermé. */
  depot_ouvert: boolean;
  traitement_ouvert: boolean;
  total: number;
  en_attente: number;
  par_cours: LigneRecoursParCours[];
}

export interface BilanRecours {
  traites: number;
  ignores: string[];
}

// ── C7 : frais ────────────────────────────────────────────────────────────
export interface TypeFrais {
  id: number;
  cle: string;
  libelle: string;
  portee: "ANNEE" | "PERIODE";
  portee_libelle: string;
  devise: string;
  obligatoire: boolean;
  pourcentage_minimum: number;
  actif: boolean;
  position: number;
  tarif_general: number;
}

export interface LigneFrais {
  type_frais_id: number;
  cle: string;
  libelle: string;
  portee: string;
  periode: number | null;
  obligatoire: boolean;
  devise: string;
  du: number;
  exonere: number;
  paye: number;
  reste: number;
  en_ordre: boolean;
  pourcentage_minimum: number;
}

export interface SituationFrais {
  inscription_id: number;
  etudiant_id: number;
  matricule: string;
  nom_complet: string;
  promotion_id: number;
  total_du: number;
  total_paye: number;
  total_reste: number;
  en_ordre: boolean;
  /** Ce qui manque, nommé : « pas en ordre » sans dire quoi oblige à chercher. */
  manquants: string[];
  lignes: LigneFrais[];
}

export interface RapportFrais {
  promotion_id: number;
  promotion_libelle: string;
  annee_libelle: string;
  effectif: number;
  en_ordre: number;
  pourcentage_en_ordre: number;
  total_du: number;
  total_paye: number;
  total_reste: number;
  situations: SituationFrais[];
}

export interface Paiement {
  id: number;
  inscription_id: number;
  type_frais_id: number;
  type_libelle: string;
  periode: number | null;
  montant: number;
  paye_le: string;
  reference: string | null;
  observation: string | null;
  constate_par: number | null;
  constate_le: string;
  annule: boolean;
  annule_motif: string | null;
  annule_par: number | null;
  annule_le: string | null;
}

// ── C8 : candidatures ─────────────────────────────────────────────────────
export interface UniteOuverte {
  id: number;
  libelle: string;
  chemin_libelles: string[];
}

export interface LigneParcours {
  nature: string;
  annee: string;
  etablissement: string;
  section: string;
  document_obtenu: string;
  pourcentage: string;
}

export interface OuvertureCandidatures {
  etablissement_id: number;
  etablissement_libelle: string;
  ouvertes: boolean;
  raison: string | null;
  annee_id: number | null;
  annee_libelle: string | null;
  unites: UniteOuverte[];
}

export interface RecuCandidature {
  reference: string;
  statut: string;
  statut_libelle: string;
  soumis_le: string;
  message: string;
}

export interface SuiviCandidature {
  reference: string;
  statut: string;
  statut_libelle: string;
  soumis_le: string;
  decide_le: string | null;
  motif: string | null;
}

export interface ParcoursCandidature {
  id: number;
  nature: string;
  annee: string | null;
  etablissement: string | null;
  section: string | null;
  document_obtenu: string | null;
  pourcentage: number | null;
  position: number;
}

export interface Candidature {
  id: number;
  reference: string;
  annee_id: number;
  annee_libelle: string;
  nom: string;
  postnom: string | null;
  prenom: string | null;
  nom_complet: string;
  sexe: string | null;
  date_naissance: string | null;
  telephone: string | null;
  email: string | null;
  province: string | null;
  choix_unite_id: number;
  choix_unite_libelle: string;
  second_choix_unite_id: number | null;
  annee_terminale: string | null;
  etablissement_terminal: string | null;
  section_terminale: string | null;
  titre_diplome: string | null;
  pourcentage_diplome: number | null;
  /** Marqué, jamais refusé tout seul : un refus automatique et muet est le pire
   *  des deux mondes. */
  sous_le_seuil: boolean;
  statut: string;
  statut_libelle: string;
  dossier_physique_complet: boolean;
  frais_regles: boolean;
  decision_motif: string | null;
  decide_le: string | null;
  decide_par: number | null;
  etudiant_id: number | null;
  inscription_id: number | null;
  soumis_le: string;
  parcours: ParcoursCandidature[];
}

export interface LigneTableauCandidatures {
  unite_id: number;
  unite_libelle: string;
  total: number;
  deposees: number;
  en_attente: number;
  approuvees: number;
  rejetees: number;
  transferees: number;
}

export interface TableauCandidatures {
  annee_id: number;
  annee_libelle: string;
  ouvertes: boolean;
  total: number;
  par_unite: LigneTableauCandidatures[];
}

export interface Restriction {
  id: number;
  annee_id: number;
  unite_id: number | null;
  unite_libelle: string;
  motif: string | null;
  pose_le: string;
}

export interface Transfert {
  inscription_id: number;
  etudiant_id: number;
  matricule: string;
}

export interface BilanCandidatures {
  traitees: number;
  ignorees: string[];
}

// ── C9 : défenses ─────────────────────────────────────────────────────────
export interface CritereDefense {
  id: number;
  libelle: string;
  pourcentage: number;
  personnalise: boolean;
}

export interface JureDefense {
  id: number;
  enseignant_id: number;
  nom_complet: string;
  role: string;
  role_libelle: string;
  remplace_enseignant_id: number | null;
  remplace_nom: string;
  remplace_motif: string | null;
  a_termine: boolean;
  note: number | null;
}

export interface Defense {
  id: number;
  projet_id: number;
  promotion_id: number;
  promotion_libelle: string;
  etudiant_id: number;
  matricule: string;
  nom_complet: string;
  sujet: string | null;
  fichier_depose: boolean;
  date: string;
  heure_debut: string | null;
  heure_fin: string | null;
  ordre: number;
  statut: string;
  statut_libelle: string;
  element_id: number | null;
  element_intitule: string;
  note_finale: number | null;
  observation: string | null;
  proclame_le: string | null;
  jures: JureDefense[];
  criteres: CritereDefense[];
  /** Les jurés qui n'ont pas fini, nommés. */
  incomplets: string[];
}

export interface ResultatDefense {
  note_finale: number | null;
  par_jure: Record<string, number>;
  incomplets: string[];
}

// ── C10 : projets ─────────────────────────────────────────────────────────
export interface AvancementProjet {
  sujet_approuve: boolean;
  directeur_attribue: boolean;
  rapporteur_attribue: boolean;
  fichier_depose: boolean;
  plagiat_depose: boolean;
  plagiat_valide: boolean;
  /** Calculé, jamais levé à la main : un drapeau resterait vrai après le
   *  retrait d'un directeur. */
  commission_peut_travailler: boolean;
  manquants: string[];
}

export interface Projet {
  id: number;
  inscription_id: number;
  etudiant_id: number;
  matricule: string;
  nom_complet: string;
  promotion_id: number;
  promotion_libelle: string;
  titre: string | null;
  objectifs: string | null;
  interets: string | null;
  domaines: string | null;
  thematiques: string | null;
  niveau_percu: string | null;
  niveau_libelle: string;
  explication_niveau: string | null;
  ressources_souhaitees: string | null;
  titre_statut: string;
  titre_statut_libelle: string;
  titre_soumis_le: string | null;
  titre_decide_le: string | null;
  titre_decide_par: number | null;
  titre_motif: string | null;
  directeur_id: number | null;
  directeur_nom: string;
  rapporteur_id: number | null;
  rapporteur_nom: string;
  fichier_nom: string | null;
  fichier_depose_le: string | null;
  plagiat_taux: number | null;
  plagiat_depose_le: string | null;
  plagiat_valide: boolean;
  avancement: AvancementProjet;
}

export interface SuiviProjets {
  promotion_id: number;
  promotion_libelle: string;
  effectif: number;
  avec_sujet_soumis: number;
  avec_sujet_approuve: number;
  avec_directeur: number;
  avec_rapporteur: number;
  avec_fichier: number;
  avec_plagiat: number;
  commission_peut_travailler: number;
}

// ── C14 : séances ─────────────────────────────────────────────────────────
export interface Seance {
  id: number;
  promotion_id: number;
  promotion_libelle: string;
  element_id: number;
  element_intitule: string;
  code_ue: string;
  enseignant_id: number | null;
  enseignant_nom: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  auditoire_id: number | null;
  statut: string;
  statut_libelle: string;
  motif_annulation: string | null;
  observation: string | null;
}
