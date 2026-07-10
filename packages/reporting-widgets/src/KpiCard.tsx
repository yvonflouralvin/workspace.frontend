"use client";

import { Sparkline } from "@repo/ui/charts/Sparkline";

export interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number[];
  accent?: string;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function fmt(v: number | string): string {
  return typeof v === "number" ? nf.format(v) : v;
}

// Stat tile : un chiffre en vedette + son libellé. Pas de graphique (le job est un
// « headline »), formatage fr-FR, chiffres tabulaires pour l'alignement.
export function KpiCard({ label, value, unit, trend, accent = "var(--color-primary)" }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3.5">
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1 rounded-r"
        style={{ backgroundColor: accent, opacity: 0.9 }}
      />
      <p className="text-label-sm text-on-surface-variant truncate pl-1.5">{label}</p>
      <p className="mt-1 pl-1.5 font-display text-headline-md leading-none text-on-surface tabular-nums">
        {fmt(value)}
        {unit ? <span className="ml-1 text-body-sm font-normal text-on-surface-variant">{unit}</span> : null}
      </p>
      {trend && trend.length >= 2 ? (
        <div className="mt-2 pl-1.5">
          <Sparkline values={trend} color={accent} />
        </div>
      ) : null}
    </div>
  );
}

export default KpiCard;
