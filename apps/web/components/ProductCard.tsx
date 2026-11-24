import Link from "next/link";
import { ProduitIcon } from "./icon-map";
import { Fleche } from "./Bouton";
import type { Produit } from "../lib/produits";

/** LA CARTE D'UN MODULE.
 *
 *  Trois choses au survol, et aucune n'est gratuite : le halo qui apparaît
 *  derrière l'icône dit que la carte est vivante, la bordure qui prend la
 *  teinte de la marque dit qu'elle est VISÉE, et la flèche qui avance dit
 *  qu'elle mène quelque part. Une carte qui ne répond pas au pointeur donne
 *  l'impression d'une image collée.
 *
 *  Le dégradé de fond part d'en haut à gauche et s'éteint : c'est ce qui
 *  empêche quinze cartes identiques de faire un damier plat.
 */
export function ProductCard({ produit, delai = 0 }: { produit: Produit; delai?: number }) {
  return (
    <Link
      href={`/produits/${produit.slug}`}
      style={delai ? { transitionDelay: `${delai}ms` } : undefined}
      className="group relative flex flex-col gap-md overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_24px_60px_-28px_rgb(53_37_205_/_0.45)]"
    >
      {/* Le halo, derrière tout, révélé au survol seulement. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-on-primary">
        <ProduitIcon nom={produit.icone} className="!text-[24px]" />
      </span>

      <div className="relative">
        <h3 className="font-display text-headline-sm text-on-surface">{produit.nom}</h3>
        <p className="mt-xs text-body-md leading-relaxed text-on-surface-variant">
          {produit.resume}
        </p>
      </div>

      <span className="relative mt-auto flex items-center gap-xs text-body-sm font-semibold text-primary">
        En savoir plus
        <Fleche />
      </span>
    </Link>
  );
}
