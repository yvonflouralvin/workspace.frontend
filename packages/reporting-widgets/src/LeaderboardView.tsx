"use client";

export type LeaderboardRow = { label: string; value: number | null };

export interface LeaderboardViewProps {
  rows: LeaderboardRow[];
  emptyMessage?: string;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const fmt = (v: number | null) => (v === null || v === undefined ? "—" : nf.format(v));

// Palmarès : classement top‑N par catégorie (déjà trié décroissant côté serveur). Rang +
// libellé + barre proportionnelle au maximum + valeur. Le rang 1 est mis en avant.
export function LeaderboardView({ rows, emptyMessage = "Aucune donnée." }: LeaderboardViewProps) {
  if (rows.length === 0) {
    return <p className="text-body-sm text-on-surface-variant/60">{emptyMessage}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value ?? 0), 0) || 1;

  return (
    <ol className="space-y-1.5">
      {rows.map((r, i) => {
        const top = i === 0;
        return (
          <li key={i} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label-sm font-semibold tabular-nums ${
                top ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-body-sm text-on-surface">{r.label}</span>
                <span className="shrink-0 text-body-sm font-semibold text-on-surface tabular-nums">{fmt(r.value)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${((r.value ?? 0) / max) * 100}%`, background: top ? "var(--color-primary)" : "var(--color-outline)" }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default LeaderboardView;
