"use client";

import { apiFetch } from "@repo/network/client";
import type { ApiFil, CommentaireFil } from "@repo/ui/FilCommentaires";
import type { FamilleApercu } from "@repo/ui/ApercuFichier";
import { lire } from "./http";

// Le fil et les documents d'une tâche parlent au même service, avec les mêmes règles ; seule
// l'adresse change selon QUI regarde. L'équipe passe par `/api/bfm/taches`, le client par
// `/api/bfm/portail/taches` — et le backend, pas cet écran, décide de ce que chacun voit.
export type Audience = "equipe" | "portail";

const BASES = {
  equipe: {
    tache: (id: number) => `/api/bfm/taches/${id}`,
    commentaire: (id: number) => `/api/bfm/commentaires/${id}`,
    piece: (id: number) => `/api/bfm/pieces/${id}`,
  },
  portail: {
    tache: (id: number) => `/api/bfm/portail/taches/${id}`,
    commentaire: (id: number) => `/api/bfm/portail/commentaires/${id}`,
    piece: (id: number) => `/api/bfm/portail/pieces/${id}`,
  },
} as const;

export interface PieceTache {
  id: number;
  /** Le nom AFFICHÉ : celui qu'on lui a donné, sinon celui du fichier. */
  nom: string;
  /** Le fichier d'origine — il dit l'extension. */
  file_name: string;
  content_type: string;
  file_size: number;
  apercu: FamilleApercu;
  created_at: string | null;
  /** Renseigné : le fichier est joint à un commentaire. Nul : déposé directement. */
  commentaire_id: number | null;
  uploaded_by_user_id: number | null;
  uploaded_by_name: string | null;
  /** Déposé par une personne de contact du client. */
  par_client: boolean;
  interne: boolean;
  peut_supprimer: boolean;
  peut_renommer: boolean;
  /** Messages de la discussion du document. */
  nb_commentaires: number;
  /** D'où il vient — renseigné sur la liste de TOUTE la mission, pas sur l'écran d'une tâche. */
  tache_id?: number | null;
  tache_titre?: string | null;
  phase_id?: number | null;
  phase_nom?: string | null;
}

export interface CommentaireTache extends CommentaireFil {
  tache_id: number;
  author_user_id: number;
  author_client: boolean;
  interne: boolean;
  attachments: PieceTache[];
}

export function urlPiece(audience: Audience, pieceId: number): string {
  return `${BASES[audience].piece(pieceId)}/content`;
}

/** Le fil parle à `racine` (`…/taches/12` ou `…/pieces/5`) : mêmes routes, mêmes règles — la
 *  discussion d'un document EST un fil, elle n'a pas de composant à part. */
function construireApiFil(audience: Audience, racine: string): ApiFil<CommentaireTache> {
  const base = BASES[audience];
  return {
    lister: (limite) =>
      apiFetch(`${racine}/commentaires?limite=${limite}`)
        .then((r) => lire<CommentaireTache[]>(r))
        // Le fil montre le nom donné au fichier : c'est celui qu'on a choisi de lire.
        .then((liste) =>
          liste.map((c) => ({ ...c, attachments: c.attachments.map((p) => ({ ...p, file_name: p.nom })) })),
        ),
    publier: async (texte, fichier, options) => {
      if (!fichier) {
        await lire(await apiFetch(`${racine}/commentaires`, { method: "POST", body: { body: texte, ...options } }));
        return;
      }
      // Multipart : pas de chiffrement @repo/network, le BFF passe les octets bruts.
      const form = new FormData();
      form.append("file", fichier);
      if (texte) form.append("body", texte);
      if (options.parent_comment_id) form.append("parent_comment_id", String(options.parent_comment_id));
      // Multipart n'a pas de listes : le serveur découpe sur la virgule.
      if (options.mention_user_ids.length) form.append("mention_user_ids", options.mention_user_ids.join(","));
      if (options.interne) form.append("interne", "true");
      await lire(await fetch(`${racine}/commentaires/file`, { method: "POST", body: form }));
    },
    modifier: (id, texte) =>
      apiFetch(base.commentaire(id), { method: "PATCH", body: { body: texte } }).then((r) => lire(r)),
    supprimer: (id) => apiFetch(base.commentaire(id), { method: "DELETE" }).then((r) => lire(r)),
    urlPiece: (_commentaire, piece) => urlPiece(audience, piece.id),
  };
}

/** Le fil général d'une tâche. */
export function apiFilTache(audience: Audience, tacheId: number): ApiFil<CommentaireTache> {
  return construireApiFil(audience, BASES[audience].tache(tacheId));
}

/** La discussion d'UN document de la tâche. */
export function apiFilPiece(audience: Audience, pieceId: number): ApiFil<CommentaireTache> {
  return construireApiFil(audience, BASES[audience].piece(pieceId));
}

export function apiDocumentsTache(audience: Audience, tacheId: number) {
  const base = BASES[audience];
  return {
    lister: () => apiFetch(`${base.tache(tacheId)}/documents`).then((r) => lire<PieceTache[]>(r)),
    deposer: async (fichier: File) => {
      const form = new FormData();
      form.append("file", fichier);
      return lire<PieceTache>(await fetch(`${base.tache(tacheId)}/documents`, { method: "POST", body: form }));
    },
    supprimer: (pieceId: number) =>
      apiFetch(base.piece(pieceId), { method: "DELETE" }).then((r) => lire<void>(r)),
    /** Un nom vide rend au document le nom de son fichier. */
    renommer: (pieceId: number, nom: string) =>
      apiFetch(base.piece(pieceId), { method: "PATCH", body: { nom } }).then((r) => lire<PieceTache>(r)),
    url: (pieceId: number) => urlPiece(audience, pieceId),
  };
}

export type ApiDocumentsTache = ReturnType<typeof apiDocumentsTache>;

/** Les documents de TOUTE la mission. Lire, renommer, supprimer, discuter se font par document et
 *  ne dépendent pas de la tâche ; seul le DÉPÔT en dépend, d'où `cible` : la tâche choisie à l'écran. */
export function apiDocumentsMission(
  missionId: number,
  cible: { current: number | null },
): ApiDocumentsTache {
  const parDocument = apiDocumentsTache("equipe", 0);
  return {
    ...parDocument,
    lister: () => apiFetch(`/api/bfm/missions/${missionId}/documents`).then((r) => lire<PieceTache[]>(r)),
    deposer: async (fichier: File) => {
      if (!cible.current) throw new Error("Choisissez d'abord la tâche concernée.");
      return apiDocumentsTache("equipe", cible.current).deposer(fichier);
    },
  };
}

/** Les personnes que le CLIENT peut nommer — l'équipe de la mission, et elle seule. */
export interface Mentionnable {
  id: number;
  nom: string;
}
export async function listMentionnablesPortail(tacheId: number): Promise<Mentionnable[]> {
  return lire<Mentionnable[]>(await apiFetch(`${BASES.portail.tache(tacheId)}/mentionnables`));
}
