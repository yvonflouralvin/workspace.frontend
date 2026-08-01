"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AttachFileOutlined,
  DeleteOutlineOutlined,
  EditOutlined,
  SendOutlined,
} from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import {
  ApercuFichier,
  VisionneuseImage,
  poidsLisible,
  type FichierJoint,
} from "@repo/ui/ApercuFichier";
import { projectsApi, type Commentaire } from "@/app/lib/projects-api";

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

/** Le fil d'une tâche : du texte, des fichiers, ou les deux.
 *
 *  Il se lit et s'écrit PAR LA TÂCHE, jamais par son projet — c'est la seule
 *  forme qui vaut aussi pour une tâche du bac du workspace, dont le projet ne
 *  s'ouvre pas.
 */
export function FilCommentaires({ taskId, canWrite }: { taskId: number; canWrite: boolean }) {
  const [fil, setFil] = useState<Commentaire[] | null>(null);
  const [texte, setTexte] = useState("");
  const [enAttente, setEnAttente] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [edition, setEdition] = useState<{ id: number; texte: string } | null>(null);
  const [aSupprimer, setASupprimer] = useState<Commentaire | null>(null);
  const [agrandie, setAgrandie] = useState<FichierJoint | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  const charger = useCallback(async () => {
    try {
      setFil(await projectsApi.listComments(taskId));
    } catch {
      setFil([]);
    }
  }, [taskId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function envoyer() {
    const corps = texte.trim();
    if (!corps && !enAttente) return;
    setBusy(true);
    setErreur(null);
    try {
      if (enAttente) await projectsApi.createCommentFile(taskId, enAttente, corps || null);
      else await projectsApi.createComment(taskId, corps);
      setTexte("");
      setEnAttente(null);
      if (champFichier.current) champFichier.current.value = "";
      await charger();
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

  return (
    <section>
      <p className="mb-2 block text-label-sm uppercase text-outline">
        Discussion{" "}
        {fil && fil.length > 0 && (
          <span className="normal-case tracking-normal text-outline">{fil.length}</span>
        )}
      </p>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
        {fil === null && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>
        )}
        {fil?.length === 0 && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">
            Rien n&apos;a encore été dit ici.
          </p>
        )}

        {fil?.map((commentaire) => (
          <article key={commentaire.id} className="flex gap-3 px-4 py-3">
            <span className="flex-none pt-0.5">
              <Avatar name={commentaire.author_name ?? "?"} size={28} />
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
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-body-sm text-on-surface">
                    {commentaire.body}
                  </p>
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
        ))}

        {canWrite && (
          <div className="px-4 py-3 bg-surface-container-low/40">
            <textarea
              rows={2}
              className={CHAMP}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => {
                // Entrée envoie, Maj+Entrée passe à la ligne — usage d'un fil.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void envoyer();
                }
              }}
              placeholder="Écrire un commentaire, ou joindre un fichier…"
            />

            {enAttente && (
              <p className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 py-1 text-label-md text-on-surface-variant">
                <AttachFileOutlined style={{ fontSize: 14 }} />
                <span className="truncate">{enAttente.name}</span>
                <span className="text-outline">{poidsLisible(enAttente.size)}</span>
                <button
                  type="button"
                  aria-label="Retirer le fichier"
                  onClick={() => {
                    setEnAttente(null);
                    if (champFichier.current) champFichier.current.value = "";
                  }}
                  className="text-outline hover:text-error transition-colors"
                >
                  ×
                </button>
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <input
                ref={champFichier}
                type="file"
                className="hidden"
                aria-label="Joindre un fichier"
                onChange={(e) => setEnAttente(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => champFichier.current?.click()}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-soft text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <AttachFileOutlined style={{ fontSize: 15 }} />
                Joindre
              </button>
              <span className="flex-1" />
              <button
                type="button"
                disabled={busy || (!texte.trim() && !enAttente)}
                onClick={envoyer}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                <SendOutlined style={{ fontSize: 15 }} />
                Envoyer
              </button>
            </div>

            {erreur && (
              <p className="mt-2 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
                {erreur}
              </p>
            )}
          </div>
        )}
      </div>

      <VisionneuseImage fichier={agrandie} onFermer={() => setAgrandie(null)} />

      {aSupprimer && (
        <ConfirmDialog
          title="Supprimer ce commentaire ?"
          message="Le message et ses pièces jointes seront retirés du fil. C'est définitif."
          confirmLabel="Supprimer"
          onConfirm={() => supprimer(aSupprimer)}
          onCancel={() => setASupprimer(null)}
        />
      )}
    </section>
  );
}
