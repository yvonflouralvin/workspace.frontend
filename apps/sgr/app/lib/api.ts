import { apiFetch } from "@repo/network/client";

/** Le client du service SGR. Tout passe par le BFF chiffré de l'app —
 *  le navigateur ne joint jamais un backend directement. */

export interface PieceCatalogue {
  cle: string;
  libelle: string;
  obligatoire: boolean;
}

export interface TypeDossier {
  cle: string;
  libelle: string;
  description: string;
  niveau: string;
  nature: string;
  pieces: PieceCatalogue[];
  ouverte: boolean;
  message_fermeture: string | null;
}

export interface PieceDeposee {
  id: number;
  cle_piece: string;
  document_id: number;
  nom_fichier: string;
  taille: number | null;
  depose_le: string;
}

export interface Etape {
  cle: string;
  libelle: string;
  franchie: boolean;
  courante: boolean;
  le: string | null;
}

export interface Transition {
  depuis: string;
  vers: string;
  par_user_id: number | null;
  par_nom: string | null;
  commentaire: string | null;
  created_at: string;
}

export interface Dossier {
  id: number;
  type_dossier: string;
  type_libelle: string;
  annee: number;
  etape: string;
  etape_libelle: string;
  reference: string | null;
  soumis_le: string | null;
  decision: string | null;
  motif_decision: string | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  faculte: string | null;
  departement: string | null;
  sujet: string | null;
  promoteur: string | null;
  copromoteur: string | null;
  comite: string | null;
  candidat_user_id: number;
  etapes: Etape[];
  pieces: PieceCatalogue[];
  deposees: PieceDeposee[];
  manquantes: string[];
  transitions: Transition[];
  peut_deposer: boolean;
  peut_soumettre: boolean;
  prochaine_etape: string | null;
  peut_avancer: boolean;
}

export interface DossierResume {
  id: number;
  reference: string | null;
  type_dossier: string;
  type_libelle: string;
  annee: number;
  etape: string;
  etape_libelle: string;
  nom: string;
  prenom: string;
  email: string;
  faculte: string | null;
  departement: string | null;
  soumis_le: string | null;
  decision: string | null;
  nb_pieces: number;
}

export interface DossiersPage {
  items: DossierResume[];
  total: number;
  page: number;
  taille: number;
}

export interface Certificat {
  reference: string;
  candidat: string;
  faculte: string | null;
  departement: string | null;
  niveau: string;
  type_libelle: string;
  sujet: string | null;
  soumis_le: string;
}

export interface Responsable {
  id: number;
  nom: string;
  fonction: string;
  actif: boolean;
  position: number;
}

export interface RendezVous {
  id: number;
  responsable_id: number;
  responsable_nom: string;
  nom: string;
  email: string;
  telephone: string | null;
  objet: string;
  message: string | null;
  souhaite_le: string | null;
  fixe_le: string | null;
  etat: string;
  reponse: string | null;
  created_at: string;
}

export interface Campagne {
  id: number;
  type_dossier: string;
  annee: number;
  ouverte: boolean;
  message_fermeture: string | null;
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

export const sgrApi = {
  types: () => apiFetch("/api/sgr/types").then((r) => lire<TypeDossier[]>(r)),

  mesDossiers: () => apiFetch("/api/sgr/mes-dossiers").then((r) => lire<Dossier[]>(r)),
  creerDossier: (corps: Record<string, unknown>) =>
    apiFetch("/api/sgr/mes-dossiers", { method: "POST", body: corps }).then((r) =>
      lire<Dossier>(r)
    ),
  dossier: (id: number) => apiFetch(`/api/sgr/dossiers/${id}`).then((r) => lire<Dossier>(r)),
  modifier: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/sgr/dossiers/${id}`, { method: "PATCH", body: corps }).then((r) =>
      lire<Dossier>(r)
    ),
  soumettre: (id: number) =>
    apiFetch(`/api/sgr/dossiers/${id}/soumettre`, { method: "POST", body: {} }).then((r) =>
      lire<Dossier>(r)
    ),
  certificat: (id: number) =>
    apiFetch(`/api/sgr/dossiers/${id}/certificat`).then((r) => lire<Certificat>(r)),

  dossiers: (params: { q?: string; etape?: string; page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.etape) query.set("etape", params.etape);
    if (params.page) query.set("page", String(params.page));
    const suffixe = query.toString() ? `?${query}` : "";
    return apiFetch(`/api/sgr/dossiers${suffixe}`).then((r) => lire<DossiersPage>(r));
  },
  avancer: (id: number, corps: { vers: string; commentaire?: string; decision?: string }) =>
    apiFetch(`/api/sgr/dossiers/${id}/avancer`, { method: "POST", body: corps }).then((r) =>
      lire<Dossier>(r)
    ),

  // Multipart : pas de chiffrement @repo/network, le BFF passe les octets bruts.
  deposer: async (dossierId: number, clePiece: string, fichier: File) => {
    const form = new FormData();
    form.append("file", fichier);
    const r = await fetch(
      `/api/sgr/dossiers/${dossierId}/pieces?cle_piece=${encodeURIComponent(clePiece)}`,
      { method: "POST", body: form }
    );
    return lire<PieceDeposee>(r);
  },
  retirerPiece: (dossierId: number, pieceId: number) =>
    apiFetch(`/api/sgr/dossiers/${dossierId}/pieces/${pieceId}`, { method: "DELETE" }).then((r) =>
      lire<void>(r)
    ),
  fichierUrl: (dossierId: number, pieceId: number) =>
    `/api/sgr/dossiers/${dossierId}/pieces/${pieceId}/fichier`,

  responsables: () => apiFetch("/api/sgr/responsables").then((r) => lire<Responsable[]>(r)),
  creerResponsable: (corps: Record<string, unknown>) =>
    apiFetch("/api/sgr/responsables", { method: "POST", body: corps }).then((r) =>
      lire<Responsable>(r)
    ),
  rendezVous: () => apiFetch("/api/sgr/rendez-vous").then((r) => lire<RendezVous[]>(r)),
  demanderRendezVous: (corps: Record<string, unknown>) =>
    apiFetch("/api/sgr/rendez-vous", { method: "POST", body: corps }).then((r) =>
      lire<RendezVous>(r)
    ),
  repondreRendezVous: (id: number, corps: Record<string, unknown>) =>
    apiFetch(`/api/sgr/rendez-vous/${id}/repondre`, { method: "POST", body: corps }).then((r) =>
      lire<RendezVous>(r)
    ),

  campagnes: () => apiFetch("/api/sgr/campagnes").then((r) => lire<Campagne[]>(r)),
  reglerCampagne: (corps: Record<string, unknown>) =>
    apiFetch("/api/sgr/campagnes", { method: "PUT", body: corps }).then((r) => lire<Campagne>(r)),
};
