"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudUploadOutlined } from "@mui/icons-material";
import { Modal } from "@repo/ui/Modal";

import { api, urlMediaEditeur, type Media } from "@/app/lib/api";

/** La bibliothèque de médias, en modale.
 *
 *  Elle sert deux gestes : choisir une image pour un bloc, et en déposer une
 *  nouvelle. Les séparer aurait obligé à sortir de l'éditeur pour téléverser,
 *  puis à y revenir pour choisir.
 */
export function Bibliotheque({
  siteId,
  onChoisir,
  onFermer,
}: {
  siteId: number;
  onChoisir: (media: Media) => void;
  onFermer: () => void;
}) {
  const [medias, setMedias] = useState<Media[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [progres, setProgres] = useState<number | null>(null);
  const [survol, setSurvol] = useState(false);
  const fichierRef = useRef<HTMLInputElement | null>(null);

  const charger = useCallback(async () => {
    try {
      setMedias(await api.medias(siteId));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setMedias([]);
    }
  }, [siteId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function televerser(fichier: File | undefined) {
    if (!fichier) return;
    setErreur(null);
    setProgres(0);
    try {
      const media = await api.televerserMedia(siteId, fichier, setProgres);
      await charger();
      onChoisir(media);
      onFermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Téléversement impossible.");
    } finally {
      setProgres(null);
    }
  }

  return (
    <Modal title="Médias du site" onClose={onFermer} width="max-w-[48rem]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          void televerser(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fichierRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          survol ? "border-primary bg-primary/5" : "border-outline-soft"
        }`}
      >
        <CloudUploadOutlined style={{ fontSize: 28 }} className="text-outline" />
        <p className="text-body-sm text-on-surface">
          Glissez une image ici, ou cliquez pour choisir un fichier
        </p>
        <p className="text-label-sm text-on-surface-variant">
          JPEG, PNG, WebP, GIF, AVIF ou PDF — 25 Mo au maximum
        </p>
        <input
          ref={fichierRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,application/pdf"
          className="hidden"
          onChange={(e) => {
            void televerser(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {progres !== null && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progres}%` }}
            />
          </div>
          <p className="mt-1 text-label-sm text-on-surface-variant">Envoi… {progres} %</p>
        </div>
      )}

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {medias === null ? (
        <p className="mt-4 text-body-sm text-on-surface-variant">Chargement…</p>
      ) : medias.length === 0 ? (
        <p className="mt-4 text-body-sm text-on-surface-variant">
          Aucun média pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-4 grid max-h-[40vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {medias.map((media) => (
            <li key={media.id}>
              <button
                type="button"
                onClick={() => {
                  onChoisir(media);
                  onFermer();
                }}
                className="group w-full overflow-hidden rounded-lg border border-outline-soft transition-colors hover:border-primary"
              >
                {media.type_mime.startsWith("image/") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={urlMediaEditeur(media.jeton)}
                    alt={media.alt ?? media.nom}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <span className="flex h-24 w-full items-center justify-center bg-surface-container text-label-sm text-on-surface-variant">
                    PDF
                  </span>
                )}
                <span className="block truncate px-1.5 py-1 text-left text-label-sm text-on-surface-variant">
                  {media.nom}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
