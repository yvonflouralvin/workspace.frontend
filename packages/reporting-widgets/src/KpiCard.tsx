"use client";

import { Sparkline } from "@repo/ui/charts/Sparkline";

export interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number[];
}

export function KpiCard({ label, value, unit, trend }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
      <p className="text-label-sm text-on-surface-variant truncate">{label}</p>
      <p className="text-headline-sm font-display mt-0.5 leading-tight text-on-surface">
        {value}
        {unit ? <span className="text-body-sm font-normal ml-1 text-on-surface-variant">{unit}</span> : null}
      </p>
      {trend && trend.length >= 2 ? (
        <div className="mt-2">
          <Sparkline values={trend} />
        </div>
      ) : null}
    </div>
  );
}

export default KpiCard;
