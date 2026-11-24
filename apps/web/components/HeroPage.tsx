import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { Puce } from "./Section";

/** LE HAUT DES PAGES INTÉRIEURES.
 *
 *  Écrit une fois, parce que la barre du haut en dépend : ses liens sont
 *  clairs tant qu'on n'a pas défilé, donc toute page doit s'ouvrir sombre
 *  (voir le commentaire de `Header`). Un hero recopié page par page aurait
 *  fini par diverger, et la divergence se serait vue sous la forme de liens
 *  invisibles — pas sous la forme d'une erreur.
 */
export function HeroPage({
  surtitre,
  titre,
  chapeau,
  enfants,
  compact = false,
}: {
  surtitre: string;
  titre: ReactNode;
  chapeau?: ReactNode;
  /** Ce qu'on glisse sous le chapeau : des boutons, une liste, un visuel. */
  enfants?: ReactNode;
  /** Pour une fiche produit, où le contenu commence tout de suite après. */
  compact?: boolean;
}) {
  return (
    <section className="nuit nuit-grille nuit-halo relative overflow-hidden">
      <span
        aria-hidden="true"
        className="anim-halo pointer-events-none absolute left-1/2 top-[-14rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--halo-indigo) 50%, transparent), transparent 65%)",
        }}
      />
      <div
        className={`relative mx-auto max-w-6xl px-gutter ${
          compact ? "ouverture pb-xl md:pb-20" : "ouverture pb-20 md:pb-24"
        }`}
      >
        <Reveal className="max-w-3xl">
          <Puce sombre>{surtitre}</Puce>
          <h1 className="mt-lg font-display text-[2.25rem] leading-[1.08] font-bold tracking-[-0.03em] text-[color:var(--nuit-texte)] sm:text-[2.75rem] lg:text-[3.5rem]">
            {titre}
          </h1>
          {chapeau && (
            <p className="mt-lg max-w-2xl text-body-lg leading-relaxed text-[color:var(--nuit-texte-doux)] md:text-[1.0625rem]">
              {chapeau}
            </p>
          )}
          {enfants && <div className="mt-xl">{enfants}</div>}
        </Reveal>
      </div>
    </section>
  );
}
