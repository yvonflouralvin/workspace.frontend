"use client";

import type { HomeStat } from "./types";

export type { HomeStat, HomeWidget } from "./types";

export interface DashboardHomeWidgetProps {
  label: string;
  appLabel?: string;
  description?: string;
  stats: HomeStat[];
  accent?: string;
  icon?: string;
  onClick?: () => void;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function fmt(v: number | string): string {
  return typeof v === "number" ? nf.format(v) : v;
}

// Carte d'accueil cliquable : pastille-icône teintée (couleur de l'app) + titre du
// domaine + 2-3 chiffres clés séparés par un filet. Un clic entre dans le domaine.
export function DashboardHomeWidget({
  label,
  appLabel,
  description,
  stats,
  accent = "var(--color-primary)",
  icon,
  onClick,
}: DashboardHomeWidgetProps) {
  const badge = (icon ?? appLabel ?? label).charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-full w-full flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-outline hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <svg
        viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        className="absolute right-4 top-5 text-on-surface-variant/40 transition-all group-hover:translate-x-0.5 group-hover:text-on-surface"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>

      <div className="flex items-center gap-3 pr-6">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-body-lg font-semibold"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
        >
          {badge}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-headline-sm leading-tight text-on-surface">{label}</h3>
          {appLabel && <p className="truncate text-label-sm text-on-surface-variant">{appLabel}</p>}
        </div>
      </div>

      {description && (
        <p className="mt-3 line-clamp-2 text-body-sm text-on-surface-variant">{description}</p>
      )}

      {stats.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-x-6 gap-y-3 border-t border-outline-variant/50 pt-4 mt-4">
          {stats.slice(0, 3).map((s, i) => (
            <div key={i} className="min-w-0">
              <p className="font-display text-headline-sm leading-none text-on-surface tabular-nums">
                {fmt(s.value)}
                {s.unit ? (
                  <span className="ml-0.5 text-body-sm font-normal text-on-surface-variant">{s.unit}</span>
                ) : null}
              </p>
              <p className="mt-1.5 max-w-[14ch] text-label-sm leading-tight text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default DashboardHomeWidget;
