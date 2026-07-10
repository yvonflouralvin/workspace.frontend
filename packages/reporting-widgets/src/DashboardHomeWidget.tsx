"use client";

import type { HomeStat } from "./types";

export type { HomeStat, HomeWidget } from "./types";

export interface DashboardHomeWidgetProps {
  label: string;
  appLabel?: string;
  description?: string;
  stats: HomeStat[];
  accent?: string;
  onClick?: () => void;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function fmt(v: number | string): string {
  return typeof v === "number" ? nf.format(v) : v;
}

// Carte d'accueil cliquable : eyebrow (app) + titre du domaine + 2-3 chiffres clés
// séparés par des filets. Un clic entre dans le domaine. Présentationnel.
export function DashboardHomeWidget({
  label,
  appLabel,
  description,
  stats,
  accent = "var(--color-primary)",
  onClick,
}: DashboardHomeWidgetProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-outline hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accent, opacity: 0.9 }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {appLabel && (
            <span
              className="inline-block rounded-full px-2 py-0.5 text-label-sm font-medium"
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
            >
              {appLabel}
            </span>
          )}
          <h3 className="mt-1.5 truncate font-display text-headline-sm leading-tight text-on-surface">
            {label}
          </h3>
        </div>
        <svg
          viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-on-surface-variant/40 transition-all group-hover:translate-x-0.5 group-hover:text-on-surface"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {description && (
        <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">{description}</p>
      )}

      {stats.length > 0 && (
        <div className="mt-4 flex divide-x divide-outline-variant/60">
          {stats.slice(0, 3).map((s, i) => (
            <div key={i} className={`min-w-0 ${i === 0 ? "pr-4" : "px-4"}`}>
              <p className="font-display text-headline-sm leading-none text-on-surface tabular-nums">
                {fmt(s.value)}
                {s.unit ? (
                  <span className="ml-0.5 text-body-sm font-normal text-on-surface-variant">{s.unit}</span>
                ) : null}
              </p>
              <p className="mt-1 truncate text-label-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default DashboardHomeWidget;
