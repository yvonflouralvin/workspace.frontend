import { apiFetch } from "@repo/network/client";

/** Client du module Form.
 *
 *  Séparé de `projects-api` : les deux parlent au même service, mais le module
 *  Form a sa propre porte publique et son propre vocabulaire. Les mélanger
 *  ferait grossir un fichier déjà long sans rien partager de réel.
 */

export type TypeQuestion =
  | "TEXTE_COURT"
  | "TEXTE_LONG"
  | "CHOIX_UNIQUE"
  | "CHOIX_MULTIPLE"
  | "LISTE"
  | "NOMBRE"
  | "DATE"
  | "EMAIL"
  | "ECHELLE"
  | "FICHIER"
  | "HEURE"
  | "CRENEAU";

export const TYPES_QUESTION: { cle: TypeQuestion; libelle: string; aOptions: boolean }[] = [
  { cle: "TEXTE_COURT", libelle: "Texte court", aOptions: false },
  { cle: "TEXTE_LONG", libelle: "Paragraphe", aOptions: false },
  { cle: "CHOIX_UNIQUE", libelle: "Choix unique", aOptions: true },
  { cle: "CHOIX_MULTIPLE", libelle: "Cases à cocher", aOptions: true },
  { cle: "LISTE", libelle: "Liste déroulante", aOptions: true },
  { cle: "NOMBRE", libelle: "Nombre", aOptions: false },
  { cle: "DATE", libelle: "Date", aOptions: false },
  { cle: "EMAIL", libelle: "Adresse e-mail", aOptions: false },
  { cle: "ECHELLE", libelle: "Échelle", aOptions: false },
  { cle: "FICHIER", libelle: "Fichier", aOptions: false },
  { cle: "HEURE", libelle: "Heure", aOptions: false },
  { cle: "CRENEAU", libelle: "Créneau", aOptions: false },
];

/** Plafond absolu d'un dépôt, aligné sur le serveur. Un concepteur ne doit pas
 *  pouvoir ouvrir un tuyau illimité sur un lien public. */
export const TAILLE_MAX_MO = 25;

export interface Section {
  id: number;
  position: number;
  titre: string;
  description: string | null;
}

export interface SectionEcrite {
  id?: number | null;
  titre: string;
  description?: string | null;
}

export interface Depot {
  document_id: number;
  file_name: string;
  file_size: number;
  content_type: string;
}

export const ACCES_LABELS: Record<string, string> = {
  PRIVE: "Collaborateurs seulement",
  WORKSPACE: "Tout le workspace",
  PUBLIC: "Par lien, sans compte",
};

export const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  PUBLIE: "Publié",
  CLOS: "Clos",
};

export interface ConfigQuestion {
  min?: number;
  max?: number;
  extensions?: string[];
  taille_max_mo?: number;
  /** Clé posée par l'application qui a créé le formulaire. */
  cle?: string;
  /** CRENEAU : la clé de la question qui porte la ressource concernée. */
  ressource_cle?: string;
  /** CRENEAU : bornes de date acceptées. */
  date_min?: string;
  date_max?: string;
}

export interface Question {
  id: number;
  section_id: number | null;
  position: number;
  type: TypeQuestion;
  libelle: string;
  aide: string | null;
  obligatoire: boolean;
  options: string[];
  config: ConfigQuestion;
  supprimee?: boolean;
  /** Combien de réponses cette question porte — et donc ce qui s'y fige. */
  nb_reponses: number;
}

export interface QuestionEcrite {
  id?: number;
  section_id?: number | null;
  type: TypeQuestion;
  libelle: string;
  aide?: string | null;
  obligatoire: boolean;
  options: string[];
  config: ConfigQuestion;
}

export interface Collaborateur {
  user_id: number;
  nom: string | null;
  role: "CONCEPTEUR" | "CONSULTATEUR";
}

export interface Formulaire {
  id: number;
  titre: string;
  description: string | null;
  statut: "BROUILLON" | "PUBLIE" | "CLOS";
  acces: "PRIVE" | "WORKSPACE" | "PUBLIC";
  jeton_public: string;
  une_reponse_par_personne: boolean;
  message_confirmation: string | null;
  /** Le circuit d'approbation par lequel partent les réponses, s'il y en a un. */
  approbation_flow_id: string | null;
  created_by: number | null;
  created_at: string;
  publie_le: string | null;
  clos_le: string | null;
  a_banniere: boolean;
  sections: Section[];
  questions: Question[];
  collaborateurs: Collaborateur[];
  nb_soumissions: number;
  peut_modifier: boolean;
  peut_voir_resultats: boolean;
  peut_repondre: boolean;
  deja_repondu: boolean;
}

export interface FormulaireResume {
  id: number;
  titre: string;
  description: string | null;
  statut: string;
  acces: string;
  created_by: number | null;
  created_at: string;
  nb_questions: number;
  nb_soumissions: number;
  approbation_flow_id: string | null;
  mon_role: string | null;
  peut_modifier: boolean;
  peut_voir_resultats: boolean;
  peut_repondre: boolean;
}

export interface Soumission {
  id: number;
  formulaire_id: number;
  repondant_user_id: number | null;
  repondant_nom: string | null;
  repondant_email: string | null;
  created_at: string;
  /** Autorise à retirer le PDF de CETTE réponse — y compris sans compte. */
  jeton_recu: string | null;
  reponses: Record<string, unknown>;
  /** Où en est la demande, quand le formulaire passe par un circuit. */
  approbation_request_id: string | null;
  approbation_statut: "EN_ATTENTE" | "APPROUVEE" | "REFUSEE" | null;
  approbation_decide_le: string | null;
}

export interface MonEnvoi {
  soumission_id: number;
  formulaire_id: number;
  formulaire_titre: string;
  envoye_le: string;
  jeton_recu: string | null;
  approbation_statut: "EN_ATTENTE" | "APPROUVEE" | "REFUSEE" | null;
  approbation_decide_le: string | null;
}

export interface MesEnvois {
  items: MonEnvoi[];
  total: number;
  page: number;
  taille: number;
}

export interface FormulairePublic {
  titre: string;
  description: string | null;
  message_confirmation: string | null;
  a_banniere: boolean;
  sections: Section[];
  questions: Question[];
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

export const formsApi = {
  lister: (params: { portee?: string; q?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.portee) query.set("portee", params.portee);
    if (params.q) query.set("q", params.q);
    const suffixe = query.toString() ? `?${query}` : "";
    return apiFetch(`/api/formulaires${suffixe}`).then((r) => lire<FormulaireResume[]>(r));
  },
  mesEnvois: (params: { page?: number; taille?: number; q?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.taille) query.set("taille", String(params.taille));
    if (params.q) query.set("q", params.q);
    const suffixe = query.toString() ? `?${query}` : "";
    return apiFetch(`/api/formulaires/mes-envois${suffixe}`).then((r) => lire<MesEnvois>(r));
  },
  creer: (titre: string) =>
    apiFetch("/api/formulaires", { method: "POST", body: { titre } }).then((r) =>
      lire<Formulaire>(r)
    ),
  get: (id: number) => apiFetch(`/api/formulaires/${id}`).then((r) => lire<Formulaire>(r)),
  modifier: (
    id: number,
    corps: Partial<{
      titre: string;
      description: string | null;
      acces: string;
      statut: string;
      une_reponse_par_personne: boolean;
      message_confirmation: string | null;
      /** `""` retire le circuit ; un identifiant de flux l'installe. */
      approbation_flow_id: string | null;
      sections: SectionEcrite[];
      questions: QuestionEcrite[];
    }>
  ) =>
    apiFetch(`/api/formulaires/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Formulaire>(r)
    ),
  supprimer: (id: number) =>
    apiFetch(`/api/formulaires/${id}`, { method: "DELETE" }).then((r) => lire<void>(r)),
  definirCollaborateurs: (id: number, lignes: { user_id: number; role: string }[]) =>
    apiFetch(`/api/formulaires/${id}/collaborateurs`, { method: "PUT", body: lignes }).then((r) =>
      lire<Formulaire>(r)
    ),
  soumettre: (id: number, reponses: { question_id: number; valeur: unknown }[]) =>
    apiFetch(`/api/formulaires/${id}/soumissions`, { method: "POST", body: { reponses } }).then(
      (r) => lire<Soumission>(r)
    ),
  soumissions: (id: number) =>
    apiFetch(`/api/formulaires/${id}/soumissions`).then((r) => lire<Soumission[]>(r)),
  dupliquer: (id: number) =>
    apiFetch(`/api/formulaires/${id}/dupliquer`, { method: "POST", body: {} }).then((r) =>
      lire<Formulaire>(r)
    ),
  // Multipart : pas de chiffrement @repo/network, le BFF passe les octets bruts.
  deposer: async (id: number, questionId: number, fichier: File) => {
    const form = new FormData();
    form.append("file", fichier);
    form.append("question_id", String(questionId));
    const r = await fetch(`/api/formulaires/${id}/fichiers`, { method: "POST", body: form });
    return lire<Depot>(r);
  },
  fichierUrl: (id: number, documentId: number) => `/api/formulaires/${id}/fichiers/${documentId}`,
  banniereUrl: (id: number) => `/api/formulaires/${id}/banniere`,
  poserBanniere: async (id: number, fichier: File) => {
    const form = new FormData();
    form.append("file", fichier);
    const r = await fetch(`/api/formulaires/${id}/banniere`, { method: "PUT", body: form });
    return lire<{ document_id: number }>(r);
  },
  retirerBanniere: (id: number) =>
    apiFetch(`/api/formulaires/${id}/banniere`, { method: "DELETE" }).then((r) => lire<void>(r)),
  // Le jeton EST l'autorisation : ce lien s'ouvre sans session, c'est ce qui
  // permet de rendre son PDF à un répondant anonyme.
  recuUrl: (jetonRecu: string) => `/api/public/recus/${encodeURIComponent(jetonRecu)}`,

  // Sans session : `fetch` nu, pas `apiFetch`. Le visiteur n'a pas la clé de
  // chiffrement, et n'a aucune raison de l'avoir.
  publicGet: async (jeton: string) => {
    const r = await fetch(`/api/public/formulaires/${encodeURIComponent(jeton)}`);
    return lire<FormulairePublic>(r);
  },
  publicDeposer: async (jeton: string, questionId: number, fichier: File) => {
    const form = new FormData();
    form.append("file", fichier);
    form.append("question_id", String(questionId));
    const r = await fetch(`/api/public/formulaires/${encodeURIComponent(jeton)}/fichiers`, {
      method: "POST",
      body: form,
    });
    return lire<Depot>(r);
  },
  publicBanniereUrl: (jeton: string) =>
    `/api/public/formulaires/${encodeURIComponent(jeton)}/banniere`,
  publicSoumettre: async (
    jeton: string,
    corps: {
      reponses: { question_id: number; valeur: unknown }[];
      repondant_nom?: string | null;
      repondant_email?: string | null;
    }
  ) => {
    const r = await fetch(`/api/public/formulaires/${encodeURIComponent(jeton)}/soumissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
    });
    return lire<{ message: string; jeton_recu: string }>(r);
  },
};
