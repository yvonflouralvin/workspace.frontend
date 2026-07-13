"use client";

import { LineChart } from "@repo/ui/charts/LineChart";

export type TimeseriesPoint = { t: string; v: number | null };

export interface TimeseriesViewProps {
  points: TimeseriesPoint[];
  granularity?: string;
  label?: string;
  color?: string;
}

function tickFormatter(granularity?: string) {
  if (granularity === "month") {
    return (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  }
  return (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function TimeseriesView({ points, granularity, label, color = "var(--color-primary)" }: TimeseriesViewProps) {
  if (points.length < 2) {
    return <p className="text-body-sm text-on-surface-variant/60">Pas assez de points pour tracer une courbe.</p>;
  }
  const series = [{ points: points.map((p) => ({ t: p.t, v: p.v ?? 0 })), color, label: label ?? "" }];
  return <LineChart series={series} formatXTick={tickFormatter(granularity)} />;
}

export default TimeseriesView;
