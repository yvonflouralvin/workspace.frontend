import type { Metadata } from "next";
import { produitsParCategorie, produits } from "../../lib/produits";
import { ProductCard } from "../../components/ProductCard";
import { HeroPage } from "../../components/HeroPage";
import { Section } from "../../components/Section";
import { Reveal } from "../../components/Reveal";
import { Bouton, Fleche } from "../../components/Bouton";
import { lienAuth } from "../../components/nav-links";

export const metadata: Metadata = {
  title: "Les modules — Solution As A Service",
  description:
    "Quinze modules sur un seul socle : facturation, comptabilité, ressources humaines, projets, stock, site web, collaborateurs virtuels. Activez ce dont vous avez besoin.",
};

export default function ProduitsPage() {
  const groupes = produitsParCategorie();

  return (
    <>
      <HeroPage
        surtitre={`${produits.length} modules · un seul socle`}
        titre="Chaque métier a son module. Tous partagent la même base."
        chapeau="Activez-en un aujourd'hui, trois le mois prochain. Il n'y a rien à connecter : vos membres, vos droits, vos clients et vos alertes sont déjà les mêmes partout."
        enfants={
          <Bouton href={lienAuth("/register")} externe variante="nuit">
            Essayer gratuitement
            <Fleche />
          </Bouton>
        }
      />

      {/* UNE SECTION PAR CATÉGORIE, et les registres alternent : sans ça,
          quinze cartes font une seule page grise où l'œil ne sait plus où il
          en est. */}
      {groupes
        .filter((g) => g.items.length > 0)
        .map((groupe, index) => (
          <Section key={groupe.categorie} registre={index % 2 === 0 ? "clair" : "creux"}>
            <Reveal>
              <div className="flex items-baseline gap-md">
                <h2 className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-on-surface md:text-[2.25rem]">
                  {groupe.categorie}
                </h2>
                <span className="text-body-sm text-on-surface-variant">
                  {groupe.items.length} module{groupe.items.length > 1 ? "s" : ""}
                </span>
              </div>
            </Reveal>

            <div className="mt-xl grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
              {groupe.items.map((produit, i) => (
                <Reveal key={produit.slug} delai={(i % 3) * 80}>
                  <ProductCard produit={produit} />
                </Reveal>
              ))}
            </div>
          </Section>
        ))}

      <Section registre="nuit" motif>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-[color:var(--nuit-texte)] md:text-[2.5rem]">
            Vous ne savez pas par où commencer&nbsp;?
          </h2>
          <p className="mt-lg text-body-lg leading-relaxed text-[color:var(--nuit-texte-doux)]">
            Dites-nous ce que vous faites et comment vous le faites aujourd&apos;hui. Nous vous
            dirons quels modules servent, et lesquels ne servent pas.
          </p>
          <div className="mt-xl flex flex-col items-center justify-center gap-sm sm:flex-row">
            <Bouton href="/contact" className="w-full sm:w-auto">
              Parler à quelqu&apos;un
              <Fleche />
            </Bouton>
            <Bouton href="/tarifs" variante="nuit" className="w-full sm:w-auto">
              Voir les tarifs
            </Bouton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
