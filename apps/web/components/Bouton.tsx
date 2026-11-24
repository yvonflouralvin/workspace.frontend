import type { ReactNode } from "react";
import Link from "next/link";

/** LES DEUX SEULS BOUTONS DU SITE.
 *
 *  Un site vitrine n'a que deux actions : commencer, et en savoir plus. Les
 *  écrire une fois évite la dérive qui guettait — six pages, six variantes de
 *  rayon, de hauteur et d'ombre, et un site qui a l'air assemblé.
 *
 *  Le lustre du bouton principal : un liseré clair en haut, qui le fait
 *  paraître éclairé par le dessus. C'est ce qui le distingue d'un rectangle
 *  de couleur, et c'est trois lignes de dégradé.
 */
const COMMUN =
  "group inline-flex items-center justify-center gap-sm rounded-xl px-lg py-[0.8rem] text-body-md font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2";

const STYLES = {
  principal:
    "bg-primary text-on-primary shadow-[0_1px_0_0_rgb(255_255_255_/_0.25)_inset,0_10px_30px_-10px_rgb(53_37_205_/_0.7)] hover:-translate-y-0.5 hover:shadow-[0_1px_0_0_rgb(255_255_255_/_0.3)_inset,0_16px_40px_-12px_rgb(53_37_205_/_0.85)] focus-visible:outline-primary",
  secondaire:
    "border border-outline-soft bg-surface-container-lowest text-on-surface hover:border-outline-variant hover:bg-surface-container-low focus-visible:outline-primary",
  nuit:
    "border border-[color:var(--nuit-filet)] bg-[color:var(--nuit-elevee)]/70 text-[color:var(--nuit-texte)] backdrop-blur hover:border-[color:var(--halo-indigo)] hover:bg-[color:var(--nuit-carte)] focus-visible:outline-[color:var(--color-primary-fixed)]",
} as const;

type Variante = keyof typeof STYLES;

export function Bouton({
  href,
  children,
  variante = "principal",
  externe = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variante?: Variante;
  /** Un lien hors de ce site (l'app d'authentification) : `<a>` et non
   *  `<Link>`, qui préchargerait une route inexistante. */
  externe?: boolean;
  className?: string;
}) {
  const classes = `${COMMUN} ${STYLES[variante]} ${className}`;

  if (externe) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** La flèche qui avance au survol. Un détail, et c'est exactement ce dont
 *  un site a besoin : le mouvement dit « ça mène quelque part » mieux que le
 *  mot « suivant ». */
export function Fleche() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
    >
      <path
        d="M2 8h11M9 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
