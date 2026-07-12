"use client";

import { Sparkline } from "@repo/ui/charts/Sparkline";

export type TrendPoint = { t: string; v: number | null };

export interface TrendViewProps {
  value: number | null;
  previous: number | null;
  points: TrendPoint[];
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function TrendView({ value, previous, points }: TrendViewProps) {
  const hasDelta = value !== null && previous !== null && previous !== 0;
  const delta = hasDelta ? ((value! - previous!) / previous!) * 100 : null;
  const up = delta !== null && delta >= 0;
  const sparkColor = up ? "var(--color-secondary)" : "var(--color-error)";

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-3xl font-bold leading-none text-on-surface tabular-nums">
          {value === null ? "—" : nf.format(value)}
        </p>
        {delta !== null ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-label-md font-semibold ${
              up ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"
            }`}
          >
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} %
          </span>
        ) : previous === 0 && value !== null && value !== 0 ? (
          <span className="rounded-md bg-secondary/10 px-1.5 py-0.5 text-label-md font-semibold text-secondary">nouveau</span>
        ) : null}
      </div>

      {points.length >= 2 && (
        <div className="mt-2">
          <Sparkline values={points.map((p) => p.v ?? 0)} color={sparkColor} height={36} />
        </div>
      )}

      <p className="mt-1 text-label-sm text-on-surface-variant/60">vs période précédente</p>
    </div>
  );
}

export default TrendView;
