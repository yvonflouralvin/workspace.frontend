import type { ReportTable } from "./types";

export interface TableWidgetProps {
  table: ReportTable;
  emptyMessage?: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(1);
  return String(value);
}

// Table légère (pas de recherche/pagination — inutile pour un agrégat live), stylée
// avec les mêmes tokens que @repo/ui/DataList pour rester cohérente.
export function TableWidget({ table, emptyMessage = "Aucune donnée." }: TableWidgetProps) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-left text-on-surface-variant">
              {table.columns.map((c) => (
                <th key={c.key} className="px-5 py-3 font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-b border-outline-variant last:border-0">
                {table.columns.map((c) => (
                  <td key={c.key} className="px-5 py-3 text-on-surface-variant">{formatCell(row[c.key])}</td>
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
