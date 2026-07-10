"use client";

import { useRef, useState } from "react";

// Histogramme catégoriel SVG natif (aucune dépendance). Marques fines, extrémité
// haute arrondie ancrée à la ligne de base, survol par barre, axes discrets.
// Série unique → pas de légende (le titre nomme la mesure).

export type BarDatum = { label: string; value: number; color?: string };

export interface BarChartProps {
  data: BarDatum[];
  unit?: string;
  height?: number;
  color?: string;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function BarChart({ data, unit, height = 200, color = "var(--color-primary)" }: BarChartProps) {
  const W = 480;
  const H = 200;
  const PAD = { top: 16, right: 8, bottom: 44, left: 40 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length === 0) return null;

  const maxV = Math.max(...data.map((d) => d.value), 0);
  const yMax = maxV * 1.15 || 1;
  const yOf = (v: number) => PAD.top + ch - (v / yMax) * ch;

  const slot = cw / data.length;
  const barW = Math.max(3, Math.min(40, slot * 0.62));
  const showValues = data.length <= 8;
  const showXLabels = data.length <= 14;
  const rotate = data.length > 7;

  const fmt = (v: number) => `${nf.format(v)}${unit ?? ""}`;

  function onEnter(d: BarDatum, cx: number, top: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setHover({
      x: cx * (rect.width / W) + rect.left,
      y: top * (rect.height / H) + rect.top,
      label: d.label,
      value: d.value,
    });
  }

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ height }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grille + ticks Y (discrets) */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + ch * (1 - f);
          return (
            <g key={f}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y}
                stroke="var(--color-outline-variant)" strokeOpacity={0.35} strokeDasharray="3 3"
              />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-on-surface-variant)">
                {nf.format(yMax * f)}
              </text>
            </g>
          );
        })}
        {/* Ligne de base */}
        <line
          x1={PAD.left} y1={PAD.top + ch} x2={PAD.left + cw} y2={PAD.top + ch}
          stroke="var(--color-outline-variant)" strokeOpacity={0.7}
        />

        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const x = cx - barW / 2;
          const yTop = yOf(d.value);
          const h = PAD.top + ch - yTop;
          const r = Math.min(4, barW / 2, h);
          const baseY = PAD.top + ch;
          // Rectangle à coins hauts arrondis, base carrée (ancrée à la ligne de base).
          const path = h > 0
            ? `M${x},${baseY} L${x},${yTop + r} Q${x},${yTop} ${x + r},${yTop} L${x + barW - r},${yTop} Q${x + barW},${yTop} ${x + barW},${yTop + r} L${x + barW},${baseY} Z`
            : "";
          const active = hover?.label === d.label;
          return (
            <g key={i}>
              {h > 0 && (
                <path
                  d={path}
                  fill={d.color ?? color}
                  fillOpacity={active ? 1 : 0.9}
                />
              )}
              {showValues && h > 0 && (
                <text x={cx} y={yTop - 5} textAnchor="middle" fontSize={9} fill="var(--color-on-surface)">
                  {fmt(d.value)}
                </text>
              )}
              {showXLabels && (
                <text
                  x={cx}
                  y={baseY + 12}
                  textAnchor={rotate ? "end" : "middle"}
                  fontSize={9}
                  fill="var(--color-on-surface-variant)"
                  transform={rotate ? `rotate(-40 ${cx} ${baseY + 12})` : undefined}
                >
                  {d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label}
                </text>
              )}
              {/* Zone de survol pleine hauteur (cible large) */}
              <rect
                x={cx - slot / 2} y={PAD.top} width={slot} height={ch}
                fill="transparent"
                onMouseEnter={() => onEnter(d, cx, yTop)}
              />
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm text-on-surface shadow-md"
          style={{ left: hover.x + 10, top: hover.y - 8, transform: "translateY(-100%)" }}
        >
          <p className="text-on-surface-variant mb-0.5">{hover.label}</p>
          <p className="font-medium">{fmt(hover.value)}</p>
        </div>
      )}
    </div>
  );
}

export default BarChart;
