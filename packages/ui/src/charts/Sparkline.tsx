"use client";

// Mini-courbe sans axes ni interaction — pour un aperçu de tendance compact (ex.
// dans une KpiCard). SVG natif, aucune dépendance.

export interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function Sparkline({ values, color = "var(--color-primary)", height = 32, className }: SparklineProps) {
  const W = 100;
  const H = 32;

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const xOf = (i: number) => (i / (values.length - 1)) * W;
  const yOf = (v: number) => H - ((v - min) / range) * (H - 4) - 2;

  const pts = values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? "w-full"}
      preserveAspectRatio="none"
      style={{ height }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default Sparkline;
