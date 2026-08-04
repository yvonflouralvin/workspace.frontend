"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CloseOutlined,
  DescriptionOutlined,
  DownloadOutlined,
  GraphicEqOutlined,
  InsertDriveFileOutlined,
  PictureAsPdfOutlined,
  PlayCircleOutlined,
} from "@mui/icons-material";

/** Familles d'aperçu. Le SERVEUR les décide à partir du type MIME et envoie le
 *  mot : sans ça chaque écran redéciderait dans son coin ce qui est affichable,
 *  et ils divergeraient. */
export type FamilleApercu = "image" | "video" | "audio" | "pdf" | "aucun";

export interface FichierJoint {
  id: number;
  file_name: string;
  content_type: string;
  file_size: number;
  apercu: FamilleApercu;
  /** URL de contenu — c'est l'appelant qui sait la construire. */
  url: string;
}

export function poidsLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function Icone({ famille }: { famille: FamilleApercu }) {
  const style = { fontSize: 18 };
  if (famille === "pdf") return <PictureAsPdfOutlined style={style} />;
  if (famille === "video") return <PlayCircleOutlined style={style} />;
  if (famille === "audio") return <GraphicEqOutlined style={style} />;
  if (famille === "image") return <DescriptionOutlined style={style} />;
  return <InsertDriveFileOutlined style={style} />;
}

/** Une pièce jointe : vignette pour ce qui s'affiche, ligne nommée sinon.
 *
 *  L'image et la vidéo se montrent tout de suite — c'est ce qu'on attend d'une
 *  conversation. Le PDF et le reste s'ouvrent à la demande : afficher un
 *  document de trente pages dans un fil le rendrait illisible. */
export function ApercuFichier({
  fichier,
  onAgrandir,
}: {
  fichier: FichierJoint;
  onAgrandir?: (fichier: FichierJoint) => void;
}) {
  const meta = `${fichier.file_name} · ${poidsLisible(fichier.file_size)}`;

  if (fichier.apercu === "image") {
    return (
      <button
        type="button"
        onClick={() => onAgrandir?.(fichier)}
        aria-label={`Agrandir ${meta}`}
        className="block overflow-hidden rounded-xl border border-outline-soft bg-surface-container-lowest hover:border-primary/40 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fichier.url}
          alt={fichier.file_name}
          className="max-h-[260px] max-w-full object-contain"
        />
      </button>
    );
  }

  if (fichier.apercu === "video") {
    return (
      <video
        controls
        preload="metadata"
        src={fichier.url}
        aria-label={meta}
        className="max-h-[300px] max-w-full rounded-xl border border-outline-soft bg-black"
      />
    );
  }

  if (fichier.apercu === "audio") {
    return (
      <div className="rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2">
        <p className="mb-1.5 text-label-md text-outline">{meta}</p>
        <audio controls preload="metadata" src={fichier.url} aria-label={meta} className="w-full" />
      </div>
    );
  }

  const ouvrirAilleurs = fichier.apercu === "pdf";
  return (
    <a
      href={fichier.url}
      target={ouvrirAilleurs ? "_blank" : undefined}
      rel={ouvrirAilleurs ? "noreferrer" : undefined}
      download={ouvrirAilleurs ? undefined : fichier.file_name}
      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface hover:border-primary/40 transition-colors"
    >
      <span className="flex-none text-outline">
        <Icone famille={fichier.apercu} />
      </span>
      <span className="min-w-0 flex-1 truncate">{fichier.file_name}</span>
      <span className="flex-none text-label-md text-outline">
        {poidsLisible(fichier.file_size)}
      </span>
      <span className="flex-none text-outline">
        <DownloadOutlined style={{ fontSize: 16 }} />
      </span>
    </a>
  );
}

/** Image plein écran. Portalisée sur `body` : dans le flux, elle serait rognée
 *  par le premier parent qui masque son débordement — un drawer, par exemple. */
export function VisionneuseImage({
  fichier,
  onFermer,
}: {
  fichier: FichierJoint | null;
  onFermer: () => void;
}) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  useEffect(() => {
    if (!fichier) return;
    const sortie = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", sortie);
    return () => window.removeEventListener("keydown", sortie);
  }, [fichier, onFermer]);

  if (!monte || !fichier) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label={fichier.file_name}
      onClick={onFermer}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-overlay p-6 animate-overlay-in"
    >
      <button
        type="button"
        aria-label="Fermer l'aperçu"
        onClick={onFermer}
        className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-card hover:text-primary transition-colors"
      >
        <CloseOutlined style={{ fontSize: 18 }} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fichier.url}
        alt={fichier.file_name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-xl object-contain shadow-modal"
      />
      <a
        href={fichier.url}
        download={fichier.file_name}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-5 inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-3 py-1.5 text-body-sm font-medium text-on-surface-variant shadow-card hover:text-primary transition-colors"
      >
        <DownloadOutlined style={{ fontSize: 16 }} />
        {fichier.file_name} · {poidsLisible(fichier.file_size)}
      </a>
    </div>,
    document.body
  );
}
