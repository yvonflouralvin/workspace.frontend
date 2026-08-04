"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRightOutlined, LockOutlined } from "@mui/icons-material";
import type { MotifBlocage, RefusBlocage } from "@/app/lib/projects-api";

/** Ce qui bloque une transition de phase, ENSEMBLE et cliquable.
 *
 *  Le backend réunit toutes les familles en un seul refus : les afficher une par
 *  une redonnerait à l'utilisateur le jeu de piste qu'on vient de lui retirer. */
export function MotifsBlocage({
  refus,
  projectId,
  onForcer,
  peutForcer,
  busy,
}: {
  refus: RefusBlocage;
  projectId: number;
  /** Non fourni = le forçage n'est pas proposé sur cet écran. */
  onForcer?: (motif: string) => void;
  peutForcer?: boolean;
  busy?: boolean;
}) {
  const [motif, setMotif] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const forcageOffert = Boolean(refus.forcage_possible && onForcer && peutForcer);

  return (
    <div className="rounded-2xl border border-error/40 bg-error-container/25 p-4">
      <p className="text-body-md font-semibold text-on-surface">{refus.message}</p>

      <ul className="mt-3 space-y-1.5">
        {refus.motifs.map((m) => (
          <li key={`${m.type}-${m.id}`}>
            <LienMotif motif={m} projectId={projectId} />
          </li>
        ))}
      </ul>

      {forcageOffert &&
        (ouvert ? (
          <div className="mt-4 border-t border-error/20 pt-3">
            <label
              htmlFor="motif-forcage-phase"
              className="block text-label-sm uppercase text-outline mb-1.5"
            >
              Justification du passage en force
            </label>
            <textarea
              id="motif-forcage-phase"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Pourquoi la phase passe malgré ce qui reste ouvert…"
              className="w-full resize-none rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
            />
            <p className="mt-1.5 text-label-md text-outline">
              Elle sera conservée avec votre nom et l&apos;horodatage, attachée à chaque jalon
              contourné. Les jalons ne deviennent pas franchis pour autant.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !motif.trim()}
                title={!motif.trim() ? "La justification est obligatoire" : undefined}
                onClick={() => onForcer!(motif.trim())}
                className="h-9 px-4 rounded-lg bg-error text-on-error text-body-sm font-semibold shadow-button hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Passer en force
              </button>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className="h-9 px-3 rounded-lg text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-body-sm font-medium text-error hover:underline"
          >
            <LockOutlined style={{ fontSize: 15 }} />
            Passer en force avec justification
          </button>
        ))}
    </div>
  );
}

function LienMotif({ motif, projectId }: { motif: MotifBlocage; projectId: number }) {
  const href =
    motif.type === "jalon"
      ? `/projects/${projectId}/jalons/${motif.id}`
      : `/projects/${projectId}/deliverables/${motif.id}`;

  return (
    <Link
      href={href}
      className="group flex items-start gap-2 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-container-lowest/60 transition-colors"
    >
      <span className="mt-[7px] w-[6px] h-[6px] flex-none rounded-full bg-error" />
      <span className="min-w-0">
        <span className="block text-body-sm font-medium text-on-surface group-hover:text-primary transition-colors">
          {motif.libelle}
        </span>
        <span className="block text-label-md text-on-surface-variant">{motif.action}</span>
      </span>
      <ChevronRightOutlined
        style={{ fontSize: 16 }}
        className="ml-auto mt-0.5 flex-none text-outline group-hover:text-primary transition-colors"
      />
    </Link>
  );
}
