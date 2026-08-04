"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DeleteOutlineOutlined,
  EditOutlined,
  ExpandMoreOutlined,
  ReplyOutlined,
} from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import {
  ApercuFichier,
  VisionneuseImage,
  type FichierJoint,
} from "@repo/ui/ApercuFichier";
import { useSessionStore } from "@repo/auth/store/session.store";
import { listMembers } from "@/app/lib/api";
import { projectsApi, type Commentaire } from "@/app/lib/projects-api";
import { CorpsCommentaire, ZoneCommentaire, type Personne } from "./ZoneCommentaire";

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
 *  Il se lit et s'écrit PAR LA TÂCHE, jamais par son projet — c'est la seule
 *  forme qui vaut aussi pour une tâche du bac du workspace, dont le projet ne
 *  s'ouvre pas.
 */
export function FilCommentaires({ taskId, canWrite }: { taskId: number; canWrite: boolean }) {
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const [fil, setFil] = useState<Commentaire[] | null>(null);
  const [combien, setCombien] = useState(LOT);
  const [reste, setReste] = useState(false);
  const [membres, setMembres] = useState<Personne[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [edition, setEdition] = useState<{ id: number; texte: string } | null>(null);
  const [repondA, setRepondA] = useState<number | null>(null);
  const [aSupprimer, setASupprimer] = useState<Commentaire | null>(null);
  const [agrandie, setAgrandie] = useState<FichierJoint | null>(null);

  // On demande UN DE PLUS que ce qu'on affiche : ce surnuméraire est la seule
  // preuve exacte qu'il reste quelque chose. Sans lui, un lot plein laisserait
  // le bouton visible sur un fil terminé.
  const charger = useCallback(async () => {
    try {
      const lot = await projectsApi.listComments(taskId, combien + 1);
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
  }, [taskId, combien]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (!workspaceId) return;
    listMembers(Number(workspaceId), { limit: 200 })
      .then((r) => setMembres(r.members.map((m) => ({ id: m.user.id, nom: m.user.username }))))
      .catch(() => {});
  }, [workspaceId]);

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
    parent: number | null
  ) {
    setBusy(true);
    setErreur(null);
    try {
      const options = { parent_comment_id: parent, mention_user_ids: mentions };
      if (fichier) await projectsApi.createCommentFile(taskId, fichier, texte || null, options);
      else await projectsApi.createComment(taskId, texte, options);
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
      await projectsApi.updateComment(edition.id, edition.texte.trim());
      setEdition(null);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function supprimer(commentaire: Commentaire) {
    setBusy(true);
    setErreur(null);
    try {
      await projectsApi.deleteComment(commentaire.id);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setASupprimer(null);
      setBusy(false);
    }
  }

  const fichiers = (commentaire: Commentaire): FichierJoint[] =>
    commentaire.attachments.map((piece) => ({
      ...piece,
      url: projectsApi.attachmentUrl(commentaire.id, piece.id),
    }));

  function Message({ commentaire, reponse }: { commentaire: Commentaire; reponse?: boolean }) {
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
      <p className="mb-2 block text-label-sm uppercase text-outline">Discussion</p>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
        {canWrite && (
          <div className="px-4 py-3 bg-surface-container-low/40">
            <ZoneCommentaire
              membres={membres}
              busy={busy}
              placeholder="Écrire un commentaire, @ pour mentionner, ou joindre un fichier…"
              onEnvoyer={(texte, fichier, mentions) =>
                publier(texte, fichier, mentions, null)
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
                  onEnvoyer={(texte, fichier, mentions) =>
                    publier(texte, fichier, mentions, racine.id)
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
