"use client";

import type { StatutUtilisation, Verdict } from "@/lib/operations-api";

export function Kpi({
  libelle,
  valeur,
  unite,
  note,
  alerte,
}: {
  libelle: string;
  valeur: number | string;
  unite?: string;
  note?: string;
  alerte?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-3">
      <p className="text-label-md text-on-surface-variant">{libelle}</p>
      <p
        className={`mt-0.5 text-headline-sm font-medium tabular-nums ${
          alerte ? "text-error" : "text-on-surface"
        }`}
      >
        {valeur}
        {unite && <span className="ml-0.5 text-body-sm font-normal text-on-surface-variant">{unite}</span>}
      </p>
      {note && <p className="mt-0.5 text-label-sm text-outline">{note}</p>}
    </div>
  );
}

export function BarreProportion({ pourcentage }: { pourcentage: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, pourcentage))}%` }}
        />
      </div>
      <span className="w-11 flex-none text-right text-label-md tabular-nums text-on-surface-variant">
        {pourcentage} %
      </span>
    </div>
  );
}

/** Les teintes du verdict. Le vert n'est PAS « bien » et le rouge « mal » : une
 *  sur-utilisation peut être assumée, une sous-utilisation peut être normale en
 *  début de période. On signale un écart, on ne distribue pas des notes — d'où
 *  l'ambre des deux côtés plutôt que rouge d'un seul. */
const TEINTES: Record<
  StatutUtilisation,
  { fond: string; barre: string; texte: string; mot: string }
> = {
  // `fond` teinte la pastille, `barre` remplit la jauge. Deux valeurs et non
  // une : un conteneur assez pâle pour porter du texte disparaît sur la piste
  // de la jauge, et une barre à 2 % se lirait comme une barre vide.
  SOUS_UTILISEE: {
    fond: "bg-priority-low-container", barre: "bg-priority-low",
    texte: "text-priority-low", mot: "Sous-utilisée",
  },
  CONFORME: {
    fond: "bg-secondary/15", barre: "bg-secondary",
    texte: "text-secondary", mot: "Dans la cible",
  },
  SUR_UTILISEE: {
    fond: "bg-error-container", barre: "bg-error",
    texte: "text-error", mot: "Sur-utilisée",
  },
  SANS_CIBLE: {
    fond: "bg-surface-container", barre: "bg-outline",
    texte: "text-on-surface-variant", mot: "Sans cible",
  },
};

export function PastilleUtilisation({ verdict }: { verdict: Verdict }) {
  const t = TEINTES[verdict.statut];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-label-md ${t.fond} ${t.texte}`}
      title={verdict.message}
    >
      {t.mot}
    </span>
  );
}

export function CarteUtilisation({
  titre,
  realise,
  verdict,
}: {
  titre: string;
  realise: number;
  verdict: Verdict;
}) {
  const t = TEINTES[verdict.statut];
  // La jauge est bornée à 150 % : au-delà, une barre qui déborde ne dit rien de
  // plus que « très au-dessus », et le chiffre le dit mieux.
  const part = verdict.cible ? Math.min(150, (realise / verdict.cible) * 100) : 0;

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-sm font-medium text-on-surface">{titre}</p>
        <PastilleUtilisation verdict={verdict} />
      </div>

      <p className="mt-1 text-headline-sm font-medium tabular-nums text-on-surface">
        {realise}
        <span className="ml-0.5 text-body-sm font-normal text-on-surface-variant">h</span>
        {verdict.cible !== null && (
          <span className="ml-2 text-body-sm font-normal text-on-surface-variant">
            / {verdict.cible} h visées
          </span>
        )}
      </p>

      {verdict.cible !== null && (
        <div className="mt-2">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-track">
            <div className={`h-full rounded-full ${t.barre}`} style={{ width: `${Math.max(part, part > 0 ? 1.5 : 0)}%` }} />
            {/* Le repère de la cible : sans lui, on lirait une barre pleine sans
                savoir si elle est atteinte ou dépassée. */}
            <span
              className="absolute top-0 h-full w-px bg-on-surface-variant"
              style={{ left: `${(100 / 150) * 100}%` }}
              aria-hidden
            />
          </div>
        </div>
      )}

      <p className="mt-2 text-label-md text-on-surface-variant">{verdict.message}</p>
    </div>
  );
}
