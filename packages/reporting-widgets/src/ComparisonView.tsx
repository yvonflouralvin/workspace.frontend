"use client";

import { BarChart } from "@repo/ui/charts/BarChart";
import { PieChart } from "@repo/ui/charts/PieChart";

export type ComparisonSerie = { label: string; value: number | null };

export interface ComparisonViewProps {
  render: string; // numbers_row | numbers_column | bar_vertical | bar_horizontal | pie
  series: ComparisonSerie[];
}

// Palette catégorielle (couleurs d'app du design system) — assignée par ordre, jamais cyclée
// au-delà de sa longueur sans le vouloir.
const PALETTE = ["#3525cd", "#006c49", "#e11d48", "#b45309", "#0e7490", "#7c3aed", "#0891b2", "#ca8a04"];
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

const color = (i: number) => PALETTE[i % PALETTE.length]!;
const fmt = (v: number | null) => (v === null || v === undefined ? "—" : nf.format(v));

export function ComparisonView({ render, series }: ComparisonViewProps) {
  if (series.length === 0) {
    return <p className="text-body-sm text-on-surface-variant/60">Aucune source.</p>;
  }

  if (render === "bar_vertical") {
    const data = series.map((s, i) => ({ label: s.label, value: s.value ?? 0, color: color(i) }));
    return <BarChart data={data} />;
  }

  if (render === "pie") {
    const data = series.map((s, i) => ({ label: s.label, value: s.value ?? 0, color: color(i) }));
    return <PieChart data={data} />;
  }

  if (render === "bar_horizontal") {
    const max = Math.max(...series.map((s) => s.value ?? 0), 0) || 1;
    return (
      <div className="space-y-2">
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-body-sm text-on-surface-variant">{s.label}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-surface-container">
              <div className="h-full rounded" style={{ width: `${((s.value ?? 0) / max) * 100}%`, background: color(i) }} />
            </div>
            <span className="w-14 shrink-0 text-right text-body-sm font-semibold text-on-surface tabular-nums">
              {fmt(s.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // numbers_row | numbers_column
  const column = render === "numbers_column";
  return (
    <div className={column ? "flex flex-col gap-3" : "flex flex-wrap gap-x-8 gap-y-3"}>
      {series.map((s, i) => (
        <div key={i} className={column ? "flex items-baseline justify-between gap-4" : ""}>
          <p className="order-2 font-display text-2xl font-bold leading-none text-on-surface tabular-nums">
            {fmt(s.value)}
          </p>
          <p className="order-1 mt-1 flex items-center gap-1.5 text-label-md text-on-surface-variant">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(i) }} />
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default ComparisonView;
