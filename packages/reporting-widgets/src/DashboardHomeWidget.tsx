"use client";

import type { HomeStat } from "./types";

export type { HomeStat, HomeWidget } from "./types";

export interface DashboardHomeWidgetProps {
  label: string;
  appLabel?: string;
  description?: string;
  stats: HomeStat[];
  onClick?: () => void;
}

// Carte d'accueil cliquable : titre du domaine + 2-3 chiffres clés. Un clic entre
// dans le domaine. Présentationnel (données via props), réutilisable par toute app.
export function DashboardHomeWidget({
  label,
  appLabel,
  description,
  stats,
  onClick,
}: DashboardHomeWidgetProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left w-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 transition-all hover:border-primary/50 hover:shadow-sm focus:outline-none focus:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {appLabel && (
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant/60 truncate">
              {appLabel}
            </p>
          )}
          <h3 className="text-headline-sm font-display text-on-surface leading-tight truncate">
            {label}
          </h3>
        </div>
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-on-surface-variant/40 group-hover:text-primary transition-colors"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {description && (
        <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">{description}</p>
      )}

      {stats.length > 0 && (
        <div className="flex gap-6 mt-4">
          {stats.slice(0, 3).map((s, i) => (
            <div key={i} className="min-w-0">
              <p className="text-headline-sm font-display text-on-surface leading-tight">
                {s.value}
                {s.unit ? (
                  <span className="text-body-sm font-normal text-on-surface-variant ml-0.5">{s.unit}</span>
                ) : null}
              </p>
              <p className="text-label-sm text-on-surface-variant truncate">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default DashboardHomeWidget;
