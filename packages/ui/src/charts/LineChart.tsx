"use client";

import { useRef, useState } from "react";

// Courbe temporelle SVG native (aucune dépendance de charting). Générique : extraite
// des constantes vitales de l'EMR hosto, réutilisable par tout widget de reporting.
// `t` est une date ISO ; `v` la valeur numérique.

export type LineChartPoint = { t: string; v: number };
export type LineChartSeries = {
  points: LineChartPoint[];
  color: string;
  label: string;
  unit?: string;
};

export interface LineChartProps {
  series: LineChartSeries[];
  normalBand?: [number, number];
  height?: number;
  formatXTick?: (iso: string) => string;
  formatPointDate?: (iso: string) => string;
}

const defaultXTick = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

const defaultPointDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function LineChart({
  series,
  normalBand,
  height = 140,
  formatXTick = defaultXTick,
  formatPointDate = defaultPointDate,
}: LineChartProps) {
  const W = 400;
  const H = 120;
  const PAD = { top: 6, right: 12, bottom: 28, left: 36 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const [tooltip, setTooltip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allVals = [
    ...series.flatMap((s) => s.points.map((p) => p.v)),
    ...(normalBand ?? []),
  ];
  const allTs = series.flatMap((s) => s.points.map((p) => new Date(p.t).getTime()));

  if (allTs.length === 0) return null;

  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const pad = (maxV - minV) * 0.15 || 1;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const tMin = Math.min(...allTs);
  const tMax = Math.max(...allTs);
  const tRange = tMax - tMin || 1;

  const xOf = (iso: string) => PAD.left + ((new Date(iso).getTime() - tMin) / tRange) * cw;
  const yOf = (v: number) => PAD.top + ch - ((v - yMin) / (yMax - yMin)) * ch;

  const allSortedTs = [...new Set(allTs)].sort((a, b) => a - b);
  const step = Math.max(1, Math.floor(allSortedTs.length / 3));
  const tickIdxs = [0, step, step * 2, allSortedTs.length - 1].filter(
    (i, pos, arr) => i < allSortedTs.length && arr.indexOf(i) === pos,
  );

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ height }}
        onMouseLeave={() => setTooltip(null)}
      >
        {normalBand && (
          <rect
            x={PAD.left}
            y={yOf(normalBand[1])}
            width={cw}
            height={Math.abs(yOf(normalBand[0]) - yOf(normalBand[1]))}
            fill="var(--color-primary)"
            fillOpacity={0.06}
          />
        )}

        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + ch * (1 - f);
          const val = yMin + (yMax - yMin) * f;
          return (
            <g key={f}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y}
                stroke="var(--color-outline-variant)" strokeOpacity={0.4} strokeDasharray="3 3"
              />
              <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-on-surface-variant)">
                {Number.isInteger(val) ? val : val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {tickIdxs.map((idx) => {
          const iso = new Date(allSortedTs[idx]!).toISOString();
          const x = xOf(iso);
          return (
            <text key={idx} x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--color-on-surface-variant)">
              {formatXTick(iso)}
            </text>
          );
        })}

        {series.map((s, si) => {
          if (s.points.length < 2) return null;
          const pts = s.points.map((p) => `${xOf(p.t)},${yOf(p.v)}`).join(" ");
          return (
            <polyline
              key={si}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {series.map((s, si) =>
          s.points.map((p, pi) => (
            <circle
              key={`${si}-${pi}`}
              cx={xOf(p.t)}
              cy={yOf(p.v)}
              r={4}
              fill={s.color}
              style={{ cursor: "default" }}
              onMouseEnter={() => {
                const svg = svgRef.current;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                const scaleX = rect.width / W;
                const scaleY = rect.height / H;
                const cx = xOf(p.t) * scaleX + rect.left;
                const cy = yOf(p.v) * scaleY + rect.top;
                const lines = series
                  .map((ss) => {
                    const match = ss.points.find((pp) => pp.t === p.t);
                    return match ? `${ss.label}: ${match.v}${ss.unit ? ` ${ss.unit}` : ""}` : null;
                  })
                  .filter(Boolean) as string[];
                setTooltip({ x: cx, y: cy, lines: [formatPointDate(p.t), ...lines] });
              }}
            />
          )),
        )}
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-label-sm text-on-surface shadow-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8, transform: "translateY(-100%)" }}
        >
          {tooltip.lines.map((l, i) => (
            <p key={i} className={i === 0 ? "text-on-surface-variant mb-0.5" : "font-medium"}>{l}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default LineChart;
