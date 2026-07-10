import { KpiCard } from "./KpiCard";
import type { ReportKpi } from "./types";

export interface KpiGridProps {
  kpis: ReportKpi[];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {kpis.map((k, i) => (
        <KpiCard key={i} label={k.label} value={k.value} unit={k.unit} />
      ))}
    </div>
  );
}

export default KpiGrid;
