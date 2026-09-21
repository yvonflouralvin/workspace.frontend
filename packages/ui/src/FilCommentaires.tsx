"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DeleteOutlineOutlined,
  EditOutlined,
  ExpandMoreOutlined,
  LockOutlined,
  ReplyOutlined,
} from "@mui/icons-material";
import { Avatar } from "./Avatar";
import { ConfirmDialog } from "./ConfirmDialog";
import { ApercuFichier, VisionneuseImage, type FichierJoint } from "./ApercuFichier";
import { CorpsCommentaire, ZoneCommentaire, type Personne } from "./ZoneCommentaire";

/** Un fichier joint tel que le serveur le décrit — sans son adresse, que l'appelant sait construire. */
export type PieceFil = Omit<FichierJoint, "url">;

/** Ce que le fil sait afficher d'un message. Les champs facultatifs n'existent que là où le
 *  module les porte : `interne` et `author_client` sont propres au module Missions. */
export interface CommentaireFil {
  id: number;
  parent_comment_id: number | null;
  author_name: string | null;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  attachments: PieceFil[];
  mentions: { user_id: number; name: string }[];
  peut_modifier: boolean;
  peut_supprimer: boolean;
  /** Note réservée à l'équipe : jamais montrée au client. */
  interne?: boolean;
  /** Écrit par une personne de contact du client. */
  author_client?: boolean;
}

/** Comment le fil parle à SON module. Le fil ne sait rien des routes : il lit, écrit, corrige,
 *  supprime — et l'appelant dit comment. À MÉMOÏSER : un objet recréé à chaque rendu
 *  relancerait le chargement à chaque rendu. */
export interface ApiFil<C extends CommentaireFil = CommentaireFil> {
  lister: (limite: number) => Promise<C[]>;
  publier: (
    texte: string,
    fichier: File | null,
    options: { parent_comment_id: number | null; mention_user_ids: number[]; interne: boolean }
  ) => Promise<unknown>;
  modifier: (id: number, texte: string) => Promise<unknown>;
  supprimer: (id: number) => Promise<unknown>;
  urlPiece: (commentaire: C, piece: PieceFil) => string;
}

/** Taille d'un lot. Le fil s'ouvre sur ce qu'on vient de dire ; le reste se
 *  demande. Le lot compte des CONVERSATIONS : une réponse ne compte pas pour un
 *  message, sinon « charger plus » ramènerait la moitié d'un échange déjà lu. */
const LOT = 5;

const CHAMP =
  "w-full resize-none rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function quand(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.round(minutes / 60)} h`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Le fil d'une tâche : du texte, des fichiers, des réponses, des mentions.
 *
 *  Partagé par le module Projets et le module Missions : ils écrivent exactement la même chose,
 *  et deux fils qui divergent finissent par ne plus se ressembler. Chacun apporte son `api`.
 */
export function FilCommentaires<C extends CommentaireFil = CommentaireFil>({
  api,
  membres,
  canWrite,
  optionInterne = false,
  titre = "Discussion",
}: {
  api: ApiFil<C>;
  /** Les personnes qu'on peut nommer avec « @ ». */
  membres: Personne[];
  canWrite: boolean;
  /** Propose « Note interne » à l'écriture. */
  optionInterne?: boolean;
  titre?: string;
}) {
  const [fil, setFil] = useState<C[] | null>(null);
  const [combien, setCombien] = useState(LOT);
  const [reste, setReste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [edition, setEdition] = useState<{ id: number; texte: string } | null>(null);
  const [repondA, setRepondA] = useState<number | null>(null);
  const [aSupprimer, setASupprimer] = useState<C | null>(null);
  const [agrandie, setAgrandie] = useState<FichierJoint | null>(null);

  // On demande UN DE PLUS que ce qu'on affiche : ce surnuméraire est la seule
  // preuve exacte qu'il reste quelque chose. Sans lui, un lot plein laisserait
  // le bouton visible sur un fil terminé.
  const charger = useCallback(async () => {
    try {
      const lot = await api.lister(combien + 1);
      const racines = lot.filter((c) => c.parent_comment_id === null);
      const gardees = racines.slice(0, combien).map((r) => r.id);
      setReste(racines.length > combien);
      setFil(
        lot.filter(
          (c) =>
            gardees.includes(c.id) ||
            (c.parent_comment_id !== null && gardees.includes(c.parent_comment_id))
        )
      );
    } catch {
      setFil([]);
      setReste(false);
    }
  }, [api, combien]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const conversations = useMemo(() => {
    const racines = (fil ?? []).filter((c) => c.parent_comment_id === null);
    return racines.map((racine) => ({
      racine,
      reponses: (fil ?? []).filter((c) => c.parent_comment_id === racine.id),
    }));
  }, [fil]);

  async function publier(
    texte: string,
    fichier: File | null,
    mentions: number[],
    parent: number | null,
    interne: boolean
  ) {
    setBusy(true);
    setErreur(null);
    try {
      await api.publier(texte, fichier, {
        parent_comment_id: parent,
        mention_user_ids: mentions,
        interne,
      });
      setRepondA(null);
      // On revient au premier lot : le message qu'on vient d'écrire est en tête,
      // c'est là qu'on le cherche.
      if (parent === null && combien !== LOT) setCombien(LOT);
      else await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function enregistrerEdition() {
    if (!edition) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.modifier(edition.id, edition.texte.trim());
      setEdition(null);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function supprimer(commentaire: C) {
    setBusy(true);
    setErreur(null);
    try {
      await api.supprimer(commentaire.id);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setASupprimer(null);
      setBusy(false);
    }
  }

  const fichiers = (commentaire: C): FichierJoint[] =>
    commentaire.attachments.map((piece) => ({ ...piece, url: api.urlPiece(commentaire, piece) }));

  function Message({ commentaire, reponse }: { commentaire: C; reponse?: boolean }) {
    return (
      <article className={`flex gap-3 px-4 py-3 ${reponse ? "pl-12" : ""}`}>
        <span className="flex-none pt-0.5">
          <Avatar name={commentaire.author_name ?? "?"} size={reponse ? 24 : 28} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-body-sm font-semibold text-on-surface">
              {commentaire.author_name ?? "Membre"}
            </span>
            <span className="text-label-md text-outline">{quand(commentaire.created_at)}</span>
            {commentaire.edited_at && (
              <span className="text-label-md text-outline-variant">modifié</span>
            )}
            {commentaire.author_client && (
              <span className="rounded-full bg-primary/10 px-1.5 py-px text-label-sm font-semibold text-primary">
                Client
              </span>
            )}
            {commentaire.interne && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-surface-container px-1.5 py-px text-label-sm font-semibold text-on-surface-variant"
                title="Jamais visible par le client"
              >
                <LockOutlined style={{ fontSize: 11 }} />
                Interne
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-0.5">
              {canWrite && !reponse && (
                <button
                  type="button"
                  aria-label="Répondre au commentaire"
                  onClick={() => setRepondA(repondA === commentaire.id ? null : commentaire.id)}
                  className="rounded-md p-1 text-outline hover:text-primary hover:bg-surface-container-low transition-colors"
                >
                  <ReplyOutlined style={{ fontSize: 15 }} />
                </button>
              )}
              {commentaire.peut_modifier && (
                <button
                  type="button"
                  aria-label="Modifier le commentaire"
                  onClick={() => setEdition({ id: commentaire.id, texte: commentaire.body ?? "" })}
                  className="rounded-md p-1 text-outline hover:text-primary hover:bg-surface-container-low transition-colors"
                >
                  <EditOutlined style={{ fontSize: 15 }} />
                </button>
              )}
              {commentaire.peut_supprimer && (
                <button
                  type="button"
                  aria-label="Supprimer le commentaire"
                  onClick={() => setASupprimer(commentaire)}
                  className="rounded-md p-1 text-outline hover:text-error hover:bg-surface-container-low transition-colors"
                >
                  <DeleteOutlineOutlined style={{ fontSize: 15 }} />
                </button>
              )}
            </span>
          </p>

          {edition?.id === commentaire.id ? (
            <div className="mt-1.5">
              <textarea
                autoFocus
                rows={3}
                className={CHAMP}
                value={edition.texte}
                onChange={(e) => setEdition({ ...edition, texte: e.target.value })}
              />
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !edition.texte.trim()}
                  onClick={enregistrerEdition}
                  className="h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEdition(null)}
                  className="h-8 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            commentaire.body && (
              <CorpsCommentaire texte={commentaire.body} mentions={commentaire.mentions} />
            )
          )}

          {commentaire.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap items-start gap-2">
              {fichiers(commentaire).map((fichier) => (
                <ApercuFichier key={fichier.id} fichier={fichier} onAgrandir={setAgrandie} />
              ))}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <section>
      {/* Le nombre affiché serait celui du LOT, pas du fil : on ne l'annonce pas
          plutôt que d'annoncer « 5 » sur une conversation de quarante. */}
      <p className="mb-2 block text-label-sm uppercase text-outline">{titre}</p>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
        {canWrite && (
          <div className="px-4 py-3 bg-surface-container-low/40">
            <ZoneCommentaire
              membres={membres}
              busy={busy}
              placeholder="Écrire un commentaire, @ pour mentionner, ou joindre un fichier…"
              optionInterne={optionInterne}
              onEnvoyer={(texte, fichier, mentions, interne) =>
                publier(texte, fichier, mentions, null, interne)
              }
            />
            {erreur && (
              <p className="mt-2 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
                {erreur}
              </p>
            )}
          </div>
        )}

        {conversations.map(({ racine, reponses }) => (
          <div key={racine.id}>
            <Message commentaire={racine} />
            {reponses.map((reponse) => (
              <Message key={reponse.id} commentaire={reponse} reponse />
            ))}
            {repondA === racine.id && (
              <div className="px-4 pb-3 pl-12">
                <ZoneCommentaire
                  membres={membres}
                  busy={busy}
                  autoFocus
                  libelleEnvoi="Répondre"
                  placeholder={`Répondre à ${racine.author_name ?? "ce message"}…`}
                  optionInterne={optionInterne}
                  onEnvoyer={(texte, fichier, mentions, interne) =>
                    publier(texte, fichier, mentions, racine.id, interne)
                  }
                  onAnnuler={() => setRepondA(null)}
                />
              </div>
            )}
          </div>
        ))}

        {fil === null && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>
        )}
        {fil?.length === 0 && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">
            Rien n&apos;a encore été dit ici.
          </p>
        )}

        {reste && (
          <button
            type="button"
            onClick={() => setCombien((n) => n + LOT)}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <ExpandMoreOutlined style={{ fontSize: 17 }} />
            Charger {LOT} messages de plus
          </button>
        )}
      </div>

      <VisionneuseImage fichier={agrandie} onFermer={() => setAgrandie(null)} />

      {aSupprimer && (
        <ConfirmDialog
          title="Supprimer ce commentaire ?"
          message={
            aSupprimer.parent_comment_id === null
              ? "Le message, ses réponses et leurs pièces jointes seront retirés du fil. C'est définitif."
              : "Le message et ses pièces jointes seront retirés du fil. C'est définitif."
          }
          confirmLabel="Supprimer"
          onConfirm={() => supprimer(aSupprimer)}
          onCancel={() => setASupprimer(null)}
        />
      )}
    </section>
  );
}
