"use client";

export interface RatioViewProps {
  numerator: number | null;
  denominator: number | null;
  percent: number | null;
  format?: string; // "percent" (défaut) | "ratio"
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const fmt = (v: number | null) => (v === null || v === undefined ? "—" : nf.format(v));

// Une valeur en proportion d'une autre : numérateur / dénominateur. Rendu en % (défaut)
// ou en ratio (×), avec une barre de progression (bornée à 100 %) et le détail num/dén.
export function RatioView({ numerator, denominator, percent, format }: RatioViewProps) {
  if (percent === null || percent === undefined) {
    return <p className="text-body-sm text-on-surface-variant/60">Donnée indisponible.</p>;
  }
  const isRatio = format === "ratio";
  const main = isRatio ? `${nf.format(percent / 100)}×` : `${nf1.format(percent)} %`;
  const frac = Math.max(0, Math.min(percent / 100, 1));

  return (
    <div className="space-y-2">
      <p className="font-display text-3xl font-bold leading-none text-on-surface tabular-nums">{main}</p>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full bg-primary" style={{ width: `${frac * 100}%` }} />
      </div>
      <p className="text-label-md text-on-surface-variant tabular-nums">
        {fmt(numerator)} <span className="text-on-surface-variant/50">/</span> {fmt(denominator)}
      </p>
    </div>
  );
}

export default RatioView;
