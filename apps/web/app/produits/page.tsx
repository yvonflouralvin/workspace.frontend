import type { Metadata } from "next";
import { produitsParCategorie } from "../../lib/produits";
import { ProductCard } from "../../components/ProductCard";

export const metadata: Metadata = {
  title: "Produits — Solution As A Service",
  description:
    "Découvrez tous les modules de la plateforme Solution As A Service : facturation, comptabilité, RH, missions, site web et bien plus.",
};

export default function ProduitsPage() {
  const groupes = produitsParCategorie();

  return (
    <div className="mx-auto max-w-6xl px-gutter py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-headline-lg font-bold text-on-surface">Nos produits</h1>
        <p className="mt-sm text-body-lg text-on-surface-variant">
          Chaque module se suffit à lui-même, et tous partagent la même plateforme : les mêmes
          clients, les mêmes membres, les mêmes permissions. Activez ce dont vous avez besoin,
          ajoutez le reste quand vous serez prêt.
        </p>
      </div>

      <div className="mt-xl flex flex-col gap-xl">
        {groupes.map(
          (groupe) =>
            groupe.items.length > 0 && (
              <section key={groupe.categorie}>
                <h2 className="text-headline-sm font-display text-on-surface">
                  {groupe.categorie}
                </h2>
                <div className="mt-md grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
                  {groupe.items.map((produit) => (
                    <ProductCard key={produit.slug} produit={produit} />
                  ))}
                </div>
              </section>
            ),
        )}
      </div>
    </div>
  );
}
