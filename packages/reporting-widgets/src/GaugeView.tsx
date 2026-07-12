"use client";

import { GaugeChart } from "@repo/ui/charts/GaugeChart";

export interface GaugeThresholds {
  good: number; // % de la cible
  warn: number; // % de la cible
}

export interface GaugeViewProps {
  value: number | null;
  target: number | null;
  direction?: string; // "higher" (défaut) | "lower"
  thresholds?: GaugeThresholds | null;
}

const GOOD = "var(--color-secondary)";
const WARN = "#b45309";
const CRIT = "var(--color-error)";

// Seuils par défaut (en % de la cible) selon le sens favorable.
function defaults(direction?: string): GaugeThresholds {
  return direction === "lower" ? { good: 100, warn: 140 } : { good: 100, warn: 60 };
}

function statusColor(value: number, target: number, direction: string | undefined, th: GaugeThresholds) {
  const pct = target !== 0 ? (value / target) * 100 : 0;
  if (direction === "lower") {
    return pct <= th.good ? GOOD : pct <= th.warn ? WARN : CRIT;
  }
  return pct >= th.good ? GOOD : pct >= th.warn ? WARN : CRIT;
}

export function GaugeView({ value, target, direction, thresholds }: GaugeViewProps) {
  if (value === null || target === null || target === undefined) {
    return <p className="text-body-sm text-on-surface-variant/60">Donnée indisponible.</p>;
  }
  const th = thresholds ?? defaults(direction);
  const marks = [th.good / 100, th.warn / 100].filter((f) => f > 0 && f <= 1);
  return <GaugeChart value={value} target={target} color={statusColor(value, target, direction, th)} marks={marks} />;
}

export default GaugeView;
