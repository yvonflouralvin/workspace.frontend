"use client";

// Jauge demi-cercle SVG native. Arc de fond + arc de valeur proportionnel à value/target
// (borné à 100 %), valeur au centre. La couleur (statut) est fournie par l'appelant.

export interface GaugeChartProps {
  value: number;
  target: number;
  color: string;
  height?: number;
  marks?: number[]; // repères de seuils, en fraction de la cible (0..1)
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function GaugeChart({ value, target, color, height = 132, marks = [] }: GaugeChartProps) {
  const cx = 100;
  const cy = 100;
  const R = 80;
  const sw = 16;

  const frac = target > 0 ? Math.max(0, Math.min(value / target, 1)) : 0;
  const a = Math.PI * (1 - frac);
  const endX = cx + R * Math.cos(a);
  const endY = cy - R * Math.sin(a);

  const bg = `M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`;
  const val = frac > 0 ? `M${cx - R},${cy} A${R},${R} 0 0 1 ${endX.toFixed(2)},${endY.toFixed(2)}` : "";
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;

  const tick = (f: number) => {
    const ang = Math.PI * (1 - Math.max(0, Math.min(f, 1)));
    const r1 = R - sw / 2 - 1;
    const r2 = R + sw / 2 + 1;
    return { x1: cx + r1 * Math.cos(ang), y1: cy - r1 * Math.sin(ang), x2: cx + r2 * Math.cos(ang), y2: cy - r2 * Math.sin(ang) };
  };

  return (
    <svg viewBox="0 0 200 122" style={{ height }} className="w-full" preserveAspectRatio="xMidYMid meet">
      <path d={bg} fill="none" stroke="var(--color-outline-variant)" strokeOpacity={0.5} strokeWidth={sw} strokeLinecap="round" />
      {val && <path d={val} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />}
      {marks.map((f, i) => {
        const t = tick(f);
        return <line key={i} x1={t.x1.toFixed(2)} y1={t.y1.toFixed(2)} x2={t.x2.toFixed(2)} y2={t.y2.toFixed(2)} stroke="var(--color-on-surface-variant)" strokeOpacity={0.55} strokeWidth={2} />;
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={26} fontWeight={700} fill="var(--color-on-surface)">
        {nf.format(value)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="var(--color-on-surface-variant)">
        / {nf.format(target)} · {pct}%
      </text>
    </svg>
  );
}

export default GaugeChart;
