import type { ReportTable } from "./types";

export interface TableWidgetProps {
  table: ReportTable;
  emptyMessage?: string;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return nf.format(value);
  return String(value);
}

// Table légère (agrégat live, pas de recherche/pagination). Colonnes numériques
// détectées → alignées à droite, chiffres tabulaires ; survol de ligne.
export function TableWidget({ table, emptyMessage = "Aucune donnée." }: TableWidgetProps) {
  const numericCols = new Set(
    table.columns
      .filter((c) => table.rows.length > 0 && table.rows.every((r) => typeof r[c.key] === "number"))
      .map((c) => c.key),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-outline-variant">
              {table.columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-5 py-2.5 text-label-sm font-medium uppercase tracking-wide text-on-surface-variant/70 ${
                    numericCols.has(c.key) ? "text-right" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-outline-variant/50 last:border-0 transition-colors hover:bg-surface-container-low"
              >
                {table.columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-5 py-2.5 ${
                      numericCols.has(c.key)
                        ? "text-right tabular-nums text-on-surface"
                        : "text-on-surface-variant"
                    }`}
                  >
                    {formatCell(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {table.rows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length} className="px-5 py-6 text-center text-on-surface-variant">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableWidget;
