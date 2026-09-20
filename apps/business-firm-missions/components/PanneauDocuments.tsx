"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChatBubbleOutlineOutlined,
  DeleteOutlineOutlined,
  DownloadOutlined,
  EditOutlined,
  ImageOutlined,
  InsertDriveFileOutlined,
  LockOutlined,
  PictureAsPdfOutlined,
  UploadFileOutlined,
} from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { FilCommentaires } from "@repo/ui/FilCommentaires";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { poidsLisible } from "@repo/ui/ApercuFichier";
import type { Personne } from "@repo/ui/ZoneCommentaire";
import { apiFilPiece, type ApiDocumentsTache, type Audience, type PieceTache } from "@/lib/fil-tache-api";

function quand(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Icone({ piece }: { piece: PieceTache }) {
  const style = { fontSize: 20 };
  if (piece.apercu === "pdf") return <PictureAsPdfOutlined style={style} />;
  if (piece.apercu === "image") return <ImageOutlined style={style} />;
  return <InsertDriveFileOutlined style={style} />;
}

/** La discussion d'UN document : le même fil que celui de la tâche, mais qui ne parle que de lui.
 *  Les messages du fil général n'y figurent pas, et inversement. */
function DiscussionDocument({
  piece,
  audience,
  membres,
  optionInterne,
  url,
  onClose,
}: {
  piece: PieceTache;
  audience: Audience;
  membres: Personne[];
  optionInterne: boolean;
  url: string;
  onClose: () => void;
}) {
  const api = useMemo(() => apiFilPiece(audience, piece.id), [audience, piece.id]);
  return (
    <RightDrawer title="Discussion sur le document" onClose={onClose} width="md:w-[520px] md:max-w-[92vw]">
      <div className="space-y-4">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-outline-soft px-3 py-2.5 hover:bg-surface-container-low transition-colors"
        >
          <span className="text-outline">
            <Icone piece={piece} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-md font-medium text-on-surface">{piece.nom}</span>
            <span className="block text-label-md text-outline">
              {poidsLisible(piece.file_size)} · ouvrir le fichier
            </span>
          </span>
        </a>
        <FilCommentaires
          api={api}
          membres={membres}
          canWrite
          optionInterne={optionInterne}
          titre="Messages"
        />
      </div>
    </RightDrawer>
  );
}

/** L'onglet Documents d'une tâche : tout ce qui a été déposé pour elle.
 *
 *  Deux origines, une seule liste : les fichiers joints à un commentaire, et ceux déposés
 *  directement ici sans passer par un message. On y voit d'où vient chacun, et qui l'a déposé —
 *  le cabinet cherche surtout « ce que le client a envoyé ».
 *
 *  `api` est à MÉMOÏSER : un objet recréé à chaque rendu relancerait le chargement.
 */
export function PanneauDocuments({
  api,
  audience,
  membres,
  canWrite,
  optionInterne = false,
  aide,
  entete,
  depotBloque,
  lienTache,
}: {
  api: ApiDocumentsTache;
  audience: Audience;
  /** Les personnes qu'on peut nommer dans la discussion d'un document. */
  membres: Personne[];
  canWrite: boolean;
  /** Propose « Note interne » dans la discussion d'un document (équipe seulement). */
  optionInterne?: boolean;
  /** Une phrase sous le titre — ce que l'on peut déposer, et qui le voit. */
  aide?: string;
  /** Un contrôle posé au-dessus de la zone de dépôt (ex. le choix de la tâche, au niveau mission). */
  entete?: ReactNode;
  /** Un motif qui empêche de déposer pour l'instant : la zone se grise et le dit. */
  depotBloque?: string | null;
  /** Où mène « la tâche d'origine » d'un document — seulement quand on réunit plusieurs tâches. */
  lienTache?: (piece: PieceTache) => { href: string; libelle: string } | null;
}) {
  const [pieces, setPieces] = useState<PieceTache[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(0);
  const [survol, setSurvol] = useState(false);
  const [aSupprimer, setASupprimer] = useState<PieceTache | null>(null);
  const [edition, setEdition] = useState<{ id: number; nom: string } | null>(null);
  const [discussion, setDiscussion] = useState<PieceTache | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  // Une édition se TERMINE une fois : Entrée puis le blur qui suit ne doivent pas envoyer deux fois,
  // et Échap ne doit pas être défait par le blur de la fermeture du champ.
  const editionTerminee = useRef(true);

  function commencerEdition(piece: PieceTache) {
    editionTerminee.current = false;
    setEdition({ id: piece.id, nom: piece.nom });
  }

  const charger = useCallback(async () => {
    try {
      setPieces(await api.lister());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setPieces((p) => p ?? []);
    }
  }, [api]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function deposer(fichiers: FileList | File[]) {
    const liste = Array.from(fichiers);
    if (liste.length === 0) return;
    setErreur(null);
    setEnvoi((n) => n + liste.length);
    // Un par un : l'échec de l'un ne doit pas perdre les autres, et l'erreur nomme le fichier.
    for (const fichier of liste) {
      try {
        await api.deposer(fichier);
      } catch (e) {
        setErreur(`« ${fichier.name} » : ${e instanceof Error ? e.message : "envoi impossible."}`);
      } finally {
        setEnvoi((n) => n - 1);
      }
    }
    if (champ.current) champ.current.value = "";
    await charger();
  }

  async function renommer() {
    if (!edition || editionTerminee.current) return;
    editionTerminee.current = true;
    const { id, nom } = edition;
    setEdition(null);
    const courant = pieces?.find((p) => p.id === id);
    // Rien n'a changé : pas de requête, pas de « modifié ».
    if (!courant || nom.trim() === courant.nom) return;
    setErreur(null);
    try {
      await api.renommer(id, nom);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Renommage impossible.");
    }
  }

  async function supprimer(piece: PieceTache) {
    setASupprimer(null);
    setErreur(null);
    try {
      await api.supprimer(piece.id);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  return (
    <div className="max-w-[900px] space-y-4">
      {aide && <p className="text-body-sm text-on-surface-variant">{aide}</p>}

      {erreur && <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>}

      {entete}

      {canWrite && (
        <div
          onDragOver={(e) => {
            if (depotBloque) return;
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            if (!depotBloque) void deposer(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            survol ? "border-primary bg-primary/5" : "border-outline-soft bg-surface-container-lowest"
          }`}
        >
          <UploadFileOutlined className="text-outline" style={{ fontSize: 28 }} />
          <p className="text-body-sm text-on-surface-variant">Glissez un fichier ici, ou</p>
          <input
            ref={champ}
            type="file"
            multiple
            className="hidden"
            aria-label="Déposer un fichier"
            onChange={(e) => e.target.files && void deposer(e.target.files)}
          />
          <button
            type="button"
            disabled={envoi > 0 || Boolean(depotBloque)}
            onClick={() => champ.current?.click()}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {envoi > 0 ? "Envoi en cours…" : "Choisir un fichier"}
          </button>
          <p className="text-label-md text-outline">
            {depotBloque ?? "25 Mo au maximum par fichier."}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        {pieces === null && <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>}
        {pieces?.length === 0 && (
          <p className="px-4 py-4 text-body-sm text-on-surface-variant">
            Aucun document pour cette tâche.
          </p>
        )}
        {pieces?.map((piece) => (
          <div key={piece.id} className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0">
            <span className="flex-none text-outline">
              <Icone piece={piece} />
            </span>
            <div className="min-w-0 flex-1">
              {edition?.id === piece.id ? (
                <input
                  autoFocus
                  value={edition.nom}
                  aria-label="Nom du document"
                  onChange={(e) => setEdition({ id: piece.id, nom: e.target.value })}
                  onBlur={() => void renommer()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void renommer();
                    if (e.key === "Escape") {
                      editionTerminee.current = true;
                      setEdition(null);
                    }
                  }}
                  className="w-full rounded-lg border border-primary bg-surface-container-lowest px-2 py-1 text-body-md font-medium text-on-surface outline-none"
                />
              ) : (
                <span className="flex items-center gap-1.5">
                  <a
                    href={api.url(piece.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate text-body-md font-medium text-on-surface hover:text-primary transition-colors"
                  >
                    {piece.nom}
                  </a>
                  {piece.peut_renommer && (
                    <button
                      type="button"
                      onClick={() => commencerEdition(piece)}
                      aria-label={`Renommer ${piece.nom}`}
                      title="Renommer"
                      className="flex-none text-outline hover:text-primary transition-colors"
                    >
                      <EditOutlined style={{ fontSize: 15 }} />
                    </button>
                  )}
                </span>
              )}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-label-md text-outline">
                <span>{poidsLisible(piece.file_size)}</span>
                {piece.nom !== piece.file_name && <span title="Fichier d'origine">· {piece.file_name}</span>}
                {(() => {
                  const lien = lienTache?.(piece);
                  return lien ? (
                    <Link href={lien.href} className="text-on-surface-variant hover:text-primary hover:underline">
                      · {lien.libelle}
                    </Link>
                  ) : null;
                })()}
                {piece.uploaded_by_name && <span>· {piece.uploaded_by_name}</span>}
                {piece.created_at && <span>· {quand(piece.created_at)}</span>}
                {piece.par_client && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-px text-label-sm font-semibold text-primary">
                    Client
                  </span>
                )}
                {piece.commentaire_id !== null && (
                  <span className="inline-flex items-center gap-0.5">
                    <ChatBubbleOutlineOutlined style={{ fontSize: 12 }} /> dans un commentaire
                  </span>
                )}
                {piece.interne && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full bg-surface-container px-1.5 py-px text-label-sm font-semibold text-on-surface-variant"
                    title="Jamais visible par le client"
                  >
                    <LockOutlined style={{ fontSize: 11 }} /> Interne
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDiscussion(piece)}
              aria-label={`Discussion sur ${piece.nom}`}
              title="Discuter de ce document"
              className={`h-8 flex-none inline-flex items-center gap-1 rounded-lg px-2 text-label-md font-semibold transition-colors ${
                piece.nb_commentaires > 0
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <ChatBubbleOutlineOutlined style={{ fontSize: 16 }} />
              {piece.nb_commentaires > 0 && piece.nb_commentaires}
            </button>
            <a
              href={api.url(piece.id)}
              download={piece.nom}
              aria-label={`Télécharger ${piece.nom}`}
              title="Télécharger"
              className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <DownloadOutlined style={{ fontSize: 18 }} />
            </a>
            {piece.peut_supprimer && (
              <button
                type="button"
                onClick={() => setASupprimer(piece)}
                aria-label={`Supprimer ${piece.nom}`}
                title="Supprimer"
                className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
              >
                <DeleteOutlineOutlined style={{ fontSize: 18 }} />
              </button>
            )}
          </div>
        ))}
      </div>

      {discussion && (
        <DiscussionDocument
          piece={discussion}
          audience={audience}
          membres={membres}
          optionInterne={optionInterne}
          url={api.url(discussion.id)}
          onClose={() => {
            setDiscussion(null);
            void charger();
          }}
        />
      )}

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.nom} » ?`}
          message={
            aSupprimer.nb_commentaires > 0
              ? "Le fichier et sa discussion seront retirés de la tâche. C'est définitif."
              : "Le fichier sera retiré de la tâche. C'est définitif."
          }
          confirmLabel="Supprimer"
          onConfirm={() => supprimer(aSupprimer)}
          onCancel={() => setASupprimer(null)}
        />
      )}
    </div>
  );
}
