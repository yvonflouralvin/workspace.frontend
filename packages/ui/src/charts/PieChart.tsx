"use client";

// Camembert SVG natif (aucune dépendance). Série catégorielle : chaque part porte sa
// couleur ; légende avec valeur et pourcentage. Texte en tokens (jamais la couleur de part).

export type PieDatum = { label: string; value: number; color: string };

export interface PieChartProps {
  data: PieDatum[];
  height?: number;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function PieChart({ data, height = 180 }: PieChartProps) {
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0);
  const R = 50;
  const C = 60;

  let acc = -Math.PI / 2;
  const slices = items.map((d) => {
    const frac = total ? d.value / total : 0;
    const a0 = acc;
    const a1 = acc + frac * 2 * Math.PI;
    acc = a1;
    return { d, frac, a0, a1 };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" style={{ height, width: height }} className="shrink-0">
        {total === 0 ? (
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-outline-variant)" strokeWidth={1} />
        ) : slices.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={slices[0]!.d.color} />
        ) : (
          slices.map((s, i) => {
            const x0 = C + R * Math.cos(s.a0);
            const y0 = C + R * Math.sin(s.a0);
            const x1 = C + R * Math.cos(s.a1);
            const y1 = C + R * Math.sin(s.a1);
            const large = s.a1 - s.a0 > Math.PI ? 1 : 0;
            return (
              <path
                key={i}
                d={`M${C},${C} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`}
                fill={s.d.color}
                stroke="var(--color-surface-container-lowest)"
                strokeWidth={1}
              />
            );
          })
        )}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={i} className="flex items-center gap-2 text-body-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
              <span className="min-w-0 flex-1 truncate text-on-surface-variant">{d.label}</span>
              <span className="shrink-0 font-semibold text-on-surface tabular-nums">{nf.format(d.value)}</span>
              <span className="w-9 shrink-0 text-right text-on-surface-variant/70 tabular-nums">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default PieChart;
