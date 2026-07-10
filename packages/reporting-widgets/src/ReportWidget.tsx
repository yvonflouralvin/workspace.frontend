"use client";

import { LineChart } from "@repo/ui/charts/LineChart";
import { BarChartWidget } from "./BarChartWidget";
import { KpiGrid } from "./KpiGrid";
import { TableWidget } from "./TableWidget";
import type { ReportData, ReportDescriptor } from "./types";

export type {
  ReportData,
  ReportDescriptor,
  ReportKpi,
  ReportSeries,
  ReportTable,
} from "./types";

export interface ReportWidgetProps {
  report: ReportDescriptor;
  data: ReportData;
}

// Aiguilleur : rend les sections présentes dans le payload (kpis / series / table).
// `report.widget === "line"` force les séries en courbe temporelle, sinon histogramme
// catégoriel. Un rapport composite (occupation) combine plusieurs sections.
export function ReportWidget({ report, data }: ReportWidgetProps) {
  const kpis = data.kpis ?? [];
  const series = data.series ?? [];
  const table = data.table && data.table.columns.length > 0 ? data.table : null;

  const isEmpty = kpis.length === 0 && series.length === 0 && !table;
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/60 p-8 text-center">
        <p className="text-body-sm text-on-surface-variant/60">Aucune donnée à afficher.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {kpis.length > 0 && <KpiGrid kpis={kpis} />}

      {series.map((s, i) => (
        <div key={i} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-label-md font-medium text-on-surface-variant mb-2">{s.label}</p>
          {report.widget === "line" ? (
            <LineChart
              series={[{ points: s.points, color: "var(--color-primary)", label: s.label, unit: s.unit }]}
            />
          ) : (
            <BarChartWidget series={s} />
          )}
        </div>
      ))}

      {table && <TableWidget table={table} />}
    </div>
  );
}

export default ReportWidget;
