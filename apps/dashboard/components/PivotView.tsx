"use client";

import type { PivotRow } from "@/lib/dashboard-api";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

// Palette catégorielle (distincte, lisible en clair/sombre).
const PALETTE = ["#3525cd", "#006c49", "#004598", "#b26a00", "#8a1c9e", "#0e7490", "#b91c4a", "#4d7c0f"];

function StackedBars({ cols, rows }: { cols: string[]; rows: PivotRow[] }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-0.5 flex justify-between text-label-md text-on-surface-variant">
              <span className="truncate">{r.label}</span>
              <span className="tabular-nums">{nf.format(r.total)}</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded" style={{ width: `${(r.total / max) * 100}%`, minWidth: r.total > 0 ? "2%" : 0 }}>
              {cols.map((cl, i) => {
                const v = r.cells[cl] ?? 0;
                if (!v || r.total <= 0) return null;
                return <div key={cl} style={{ width: `${(v / r.total) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }} title={`${cl}: ${nf.format(v)}`} />;
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {cols.map((cl, i) => (
          <span key={cl} className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            {cl}
          </span>
        ))}
      </div>
    </div>
  );
}

// Tableau croisé : rendu tableau (défaut) ou histogramme empilé.
export function PivotView({ cols, rows, render = "table" }: { cols: string[]; rows: PivotRow[]; render?: string }) {
  if (!rows.length) return <p className="text-body-sm text-on-surface-variant/60">Aucune donnée.</p>;
  if (render === "bar_stacked") return <StackedBars cols={cols} rows={rows} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-left text-label-md text-on-surface-variant">
            <th className="px-2 py-1 font-medium" />
            {cols.map((c) => <th key={c} className="px-2 py-1 text-right font-medium">{c}</th>)}
            <th className="px-2 py-1 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-outline-variant/50 last:border-0">
              <td className="px-2 py-1 font-medium text-on-surface">{r.label}</td>
              {cols.map((c) => <td key={c} className="px-2 py-1 text-right tabular-nums text-on-surface-variant">{nf.format(r.cells[c] ?? 0)}</td>)}
              <td className="px-2 py-1 text-right font-semibold tabular-nums text-on-surface">{nf.format(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
