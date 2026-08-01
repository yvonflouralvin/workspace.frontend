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
  | "ECHELLE";

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
];

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

export interface Question {
  id: number;
  position: number;
  type: TypeQuestion;
  libelle: string;
  aide: string | null;
  obligatoire: boolean;
  options: string[];
  config: { min?: number; max?: number };
  supprimee?: boolean;
}

export interface QuestionEcrite {
  id?: number;
  type: TypeQuestion;
  libelle: string;
  aide?: string | null;
  obligatoire: boolean;
  options: string[];
  config: { min?: number; max?: number };
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
  created_by: number | null;
  created_at: string;
  publie_le: string | null;
  clos_le: string | null;
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
  reponses: Record<string, unknown>;
}

export interface FormulairePublic {
  titre: string;
  description: string | null;
  message_confirmation: string | null;
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

  // Sans session : `fetch` nu, pas `apiFetch`. Le visiteur n'a pas la clé de
  // chiffrement, et n'a aucune raison de l'avoir.
  publicGet: async (jeton: string) => {
    const r = await fetch(`/api/public/formulaires/${encodeURIComponent(jeton)}`);
    return lire<FormulairePublic>(r);
  },
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
    return lire<{ message: string }>(r);
  },
};
