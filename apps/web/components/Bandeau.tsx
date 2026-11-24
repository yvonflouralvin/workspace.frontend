import { produits } from "../lib/produits";

/** LA BANDE QUI DÉFILE — l'étendue de la plateforme, en un coup d'œil.
 *
 *  Quinze modules dans une grille, c'est un inventaire : on les compte. Les
 *  mêmes quinze qui glissent sans fin, c'est une impression d'étendue — on ne
 *  les compte plus, on comprend qu'il y en a beaucoup. C'est le seul endroit
 *  du site où l'on cherche cet effet-là plutôt que la précision.
 *
 *  LA LISTE EST DOUBLÉE, et c'est ce qui rend la boucle invisible : la piste
 *  se translate de la moitié de sa largeur, donc au moment où elle revient à
 *  zéro, le second exemplaire se trouve exactement là où était le premier.
 *  Sans le doublon, le défilement sauterait à chaque tour.
 *
 *  `aria-hidden` : les quinze noms sont déjà listés en clair sur la page des
 *  produits, et les faire lire deux fois à voix haute n'apporte rien.
 */
export function Bandeau() {
  const piste = [...produits, ...produits];

  return (
    <div
      aria-hidden="true"
      className="relative flex overflow-hidden border-y border-[color:var(--nuit-filet)] py-md"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <div className="anim-defile flex w-max shrink-0 items-center gap-xl">
        {piste.map((p, i) => (
          <span key={`${p.slug}-${i}`} className="flex items-center gap-xl">
            <span className="whitespace-nowrap text-body-md text-[color:var(--nuit-texte-doux)]">
              {p.nom}
            </span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-[color:var(--halo-indigo)]" />
          </span>
        ))}
      </div>
    </div>
  );
}
