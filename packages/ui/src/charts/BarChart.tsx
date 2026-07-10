"use client";

// Histogramme catégoriel SVG natif (aucune dépendance). Même socle d'échelles que
// LineChart. Réutilisable par les widgets de reporting (ex. taux par service).

export type BarDatum = { label: string; value: number; color?: string };

export interface BarChartProps {
  data: BarDatum[];
  unit?: string;
  height?: number;
  color?: string;
}

export function BarChart({ data, unit, height = 180, color = "var(--color-primary)" }: BarChartProps) {
  const W = 400;
  const H = 160;
  const PAD = { top: 14, right: 12, bottom: 30, left: 32 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  if (data.length === 0) return null;

  const maxV = Math.max(...data.map((d) => d.value), 0);
  const yMax = maxV * 1.15 || 1;
  const yOf = (v: number) => PAD.top + ch - (v / yMax) * ch;

  const slot = cw / data.length;
  const barW = Math.min(48, slot * 0.6);

  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet" style={{ height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD.top + ch * (1 - f);
          const val = yMax * f;
          return (
            <g key={f}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + cw} y2={y}
                stroke="var(--color-outline-variant)" strokeOpacity={0.4} strokeDasharray="3 3"
              />
              <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-on-surface-variant)">
                {Number.isInteger(val) ? val : val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const x = cx - barW / 2;
          const y = yOf(d.value);
          const h = PAD.top + ch - y;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx={3} fill={d.color ?? color} />
              <text x={cx} y={y - 4} textAnchor="middle" fontSize={9} fill="var(--color-on-surface)">
                {fmt(d.value)}{unit ? unit : ""}
              </text>
              <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--color-on-surface-variant)">
                {d.label.length > 8 ? `${d.label.slice(0, 7)}…` : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default BarChart;
