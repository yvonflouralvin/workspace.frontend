"use client";

import type { ReactNode } from "react";
import type { HomeStat } from "./types";

export type { HomeStat, HomeWidget } from "./types";

export interface DashboardHomeWidgetProps {
  label: string;
  appLabel?: string;
  stats: HomeStat[];
  accent?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function fmt(v: number | string): string {
  return typeof v === "number" ? nf.format(v) : v;
}

// Carte d'accueil — même présentation que les StatCard de l'app workspace :
// carte rounded-2xl, pastille-icône teintée en haut-droite, grande valeur en gras.
// Adaptée au domaine : chiffre héros (1re stat) + ligne secondaire pour les autres,
// cliquable pour entrer dans le domaine.
export function DashboardHomeWidget({
  label,
  appLabel,
  stats,
  accent = "var(--color-primary)",
  icon,
  onClick,
}: DashboardHomeWidgetProps) {
  const [hero, ...rest] = stats;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body-md font-semibold text-on-surface">{label}</p>
          {appLabel && <p className="mt-0.5 truncate text-label-md text-on-surface-variant">{appLabel}</p>}
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
        >
          {icon}
        </span>
      </div>

      {hero && (
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-bold leading-none text-on-surface tabular-nums">
            {fmt(hero.value)}
            {hero.unit ? <span className="ml-1 text-body-lg font-semibold text-on-surface-variant">{hero.unit}</span> : null}
          </p>
          <p className="text-body-sm text-on-surface-variant">{hero.label}</p>
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-wrap items-center text-body-sm text-on-surface-variant">
          {rest.map((s, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="mx-1.5 text-outline-variant">·</span>}
              <span className="font-semibold text-on-surface tabular-nums">{fmt(s.value)}</span>
              <span className="ml-1">{s.label}</span>
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default DashboardHomeWidget;
