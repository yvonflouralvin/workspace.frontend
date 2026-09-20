"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatBubbleOutlineOutlined,
  DeleteOutlineOutlined,
  DownloadOutlined,
  ImageOutlined,
  InsertDriveFileOutlined,
  LockOutlined,
  PictureAsPdfOutlined,
  UploadFileOutlined,
} from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { poidsLisible } from "@repo/ui/ApercuFichier";
import type { ApiDocumentsTache, PieceTache } from "@/lib/fil-tache-api";

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
  canWrite,
  aide,
}: {
  api: ApiDocumentsTache;
  canWrite: boolean;
  /** Une phrase sous le titre — ce que l'on peut déposer, et qui le voit. */
  aide?: string;
}) {
  const [pieces, setPieces] = useState<PieceTache[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(0);
  const [survol, setSurvol] = useState(false);
  const [aSupprimer, setASupprimer] = useState<PieceTache | null>(null);
  const champ = useRef<HTMLInputElement>(null);

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

      {canWrite && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            void deposer(e.dataTransfer.files);
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
            disabled={envoi > 0}
            onClick={() => champ.current?.click()}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {envoi > 0 ? "Envoi en cours…" : "Choisir un fichier"}
          </button>
          <p className="text-label-md text-outline">25 Mo au maximum par fichier.</p>
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
              <a
                href={api.url(piece.id)}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-body-md font-medium text-on-surface hover:text-primary transition-colors"
              >
                {piece.file_name}
              </a>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-label-md text-outline">
                <span>{poidsLisible(piece.file_size)}</span>
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
            <a
              href={api.url(piece.id)}
              download={piece.file_name}
              aria-label={`Télécharger ${piece.file_name}`}
              title="Télécharger"
              className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
            >
              <DownloadOutlined style={{ fontSize: 18 }} />
            </a>
            {piece.peut_supprimer && (
              <button
                type="button"
                onClick={() => setASupprimer(piece)}
                aria-label={`Supprimer ${piece.file_name}`}
                title="Supprimer"
                className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
              >
                <DeleteOutlineOutlined style={{ fontSize: 18 }} />
              </button>
            )}
          </div>
        ))}
      </div>

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.file_name} » ?`}
          message="Le fichier sera retiré de la tâche. C'est définitif."
          confirmLabel="Supprimer"
          onConfirm={() => supprimer(aSupprimer)}
          onCancel={() => setASupprimer(null)}
        />
      )}
    </div>
  );
}
