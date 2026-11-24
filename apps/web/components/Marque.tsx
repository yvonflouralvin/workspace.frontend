/** LE MONOGRAMME.
 *
 *  Une lettre dans un carré de couleur, c'est le logo par défaut de tout
 *  projet qui n'en a pas encore. Celui-ci est dessiné : trois barres qui
 *  s'empilent et se décalent — les modules sur un socle, c'est-à-dire
 *  l'argument du produit réduit à sa plus simple expression.
 *
 *  En SVG et non en image : net à toutes les tailles, sur tous les écrans, et
 *  il prend la couleur qu'on lui donne au lieu d'en imposer une.
 */
export function Marque({
  className = "",
  sombre = false,
}: {
  className?: string;
  sombre?: boolean;
}) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={sombre ? "marque-nuit" : "marque-jour"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={sombre ? "#c3c0ff" : "var(--color-primary-container)"} />
          <stop offset="100%" stopColor={sombre ? "#6ffbbe" : "var(--color-primary)"} />
        </linearGradient>
      </defs>
      <rect
        width="32"
        height="32"
        rx="8"
        fill={sombre ? "var(--nuit-carte)" : `url(#marque-jour)`}
        stroke={sombre ? "var(--nuit-filet)" : "none"}
      />
      {/* Les trois barres : la plus large en bas, c'est le socle. */}
      <rect x="9" y="8" width="10" height="3.5" rx="1.75" fill={sombre ? "url(#marque-nuit)" : "#fff"} fillOpacity={sombre ? 1 : 0.95} />
      <rect x="12" y="14.25" width="11" height="3.5" rx="1.75" fill={sombre ? "url(#marque-nuit)" : "#fff"} fillOpacity={sombre ? 0.75 : 0.75} />
      <rect x="7" y="20.5" width="18" height="3.5" rx="1.75" fill={sombre ? "url(#marque-nuit)" : "#fff"} />
    </svg>
  );
}
