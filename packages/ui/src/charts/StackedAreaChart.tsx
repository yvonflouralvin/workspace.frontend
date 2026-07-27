"use client";

/** Aires empilées — SVG natif, aucune dépendance de charting, comme les autres
 *  primitives de ce dossier.
 *
 *  GÉNÉRIQUE : ce composant ne connaît ni colonne, ni WIP, ni phase. Il empile
 *  des séries nommées sur un axe de catégories, rien de plus. Toute sémantique
 *  métier reste dans l'app qui l'utilise. */
export interface StackedAreaSerie {
  cle: string;
  libelle: string;
  /** Classe de remplissage, issue des tokens du design system. */
  fill: string;
}

export function StackedAreaChart({
  points,
  series,
  height = 200,
  emptyLabel = "Aucune donnée sur la période.",
}: {
  /** Un point par abscisse : `{ label, [cle]: valeur }`. */
  points: { label: string; valeurs: Record<string, number> }[];
  series: StackedAreaSerie[];
  height?: number;
  emptyLabel?: string;
}) {
  if (points.length === 0) {
    return <p className="text-body-sm text-on-surface-variant">{emptyLabel}</p>;
  }

  const totaux = points.map((p) => series.reduce((s, serie) => s + (p.valeurs[serie.cle] ?? 0), 0));
  const max = Math.max(1, ...totaux);
  const largeur = 100;
  const pas = points.length > 1 ? largeur / (points.length - 1) : 0;

  // Empilement cumulatif : chaque bande part du sommet de la précédente.
  const bases = points.map(() => 0);
  const bandes = series.map((serie) => {
    const hauts: number[] = [];
    points.forEach((point, i) => {
      bases[i] = (bases[i] ?? 0) + (point.valeurs[serie.cle] ?? 0);
      hauts.push(bases[i]!);
    });
    const monte = hauts.map((v, i) => `${i * pas},${height - (v / max) * height}`);
    const descend = hauts
      .map((v, i) => ({ v, i }))
      .reverse()
      .map(({ i }) => {
        const dessous = hauts[i]! - (points[i]!.valeurs[serie.cle] ?? 0);
        return `${i * pas},${height - (dessous / max) * height}`;
      });
    return { serie, d: `M${monte.join(" L")} L${descend.join(" L")} Z` };
  });

  return (
    <div>
      <svg
        viewBox={`0 0 ${largeur} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Flux cumulé"
      >
        {bandes.map(({ serie, d }) => (
          <path key={serie.cle} d={d} className={serie.fill} opacity={0.85} />
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
        {series.map((serie) => (
          <span key={serie.cle} className="inline-flex items-center gap-1.5 text-label-md text-outline">
            <span className={`w-2.5 h-2.5 rounded-sm ${serie.fill}`} />
            {serie.libelle}
          </span>
        ))}
        <span className="ml-auto text-label-md text-outline">
          {points[0]?.label} → {points[points.length - 1]?.label}
        </span>
      </div>
    </div>
  );
}
