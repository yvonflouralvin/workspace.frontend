"use client";

import { GaugeChart } from "@repo/ui/charts/GaugeChart";

export interface GaugeViewProps {
  value: number | null;
  target: number | null;
  direction?: string; // "higher" (défaut) | "lower"
}

const GOOD = "var(--color-secondary)";
const WARN = "#b45309";
const CRIT = "var(--color-error)";

function statusColor(value: number, target: number, direction?: string) {
  const ratio = target !== 0 ? value / target : 0;
  if (direction === "lower") {
    return ratio <= 1 ? GOOD : ratio <= 1.4 ? WARN : CRIT;
  }
  return ratio >= 1 ? GOOD : ratio >= 0.6 ? WARN : CRIT;
}

export function GaugeView({ value, target, direction }: GaugeViewProps) {
  if (value === null || target === null || target === undefined) {
    return <p className="text-body-sm text-on-surface-variant/60">Donnée indisponible.</p>;
  }
  return <GaugeChart value={value} target={target} color={statusColor(value, target, direction)} />;
}

export default GaugeView;
