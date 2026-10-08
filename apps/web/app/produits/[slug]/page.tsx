import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowForward } from "@mui/icons-material";
import { produits, getProduit } from "../../../lib/produits";
import { ProduitIcon } from "../../../components/icon-map";
import { ProductCard } from "../../../components/ProductCard";
import { AUTH_APP_URL } from "../../../components/nav-links";

export function generateStaticParams() {
  return produits.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const produit = getProduit(slug);
  if (!produit) return {};
  return {
    title: `${produit.nom} — Solution As A Service`,
    description: produit.resume,
  };
}

export default async function ProduitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const produit = getProduit(slug);
  if (!produit) notFound();

  const autres = produits.filter((p) => p.slug !== produit.slug).slice(0, 3);

  return (
    <div>
      <section className="border-b border-outline-soft bg-surface-container-low">
        <div className="mx-auto max-w-6xl px-gutter py-16">
          <Link href="/produits" className="text-body-sm font-medium text-primary">
            ← Tous les produits
          </Link>
          <div className="mt-md flex items-start gap-md">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary">
              <ProduitIcon nom={produit.icone} className="!text-[28px]" />
            </span>
            <div>
              <p className="text-label-md font-medium uppercase tracking-wide text-primary">
                {produit.categorie}
              </p>
              <h1 className="mt-xs font-display text-headline-lg font-bold text-on-surface">
                {produit.nom}
              </h1>
              <p className="mt-sm max-w-2xl text-body-lg text-on-surface-variant">
                {produit.accroche}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-xl px-gutter py-16 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="text-headline-sm font-display text-on-surface">Présentation</h2>
          <p className="mt-sm text-body-lg text-on-surface-variant">{produit.description}</p>
        </div>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card">
          <h2 className="text-headline-sm font-display text-on-surface">Ce module inclut</h2>
          <ul className="mt-md flex flex-col gap-sm">
            {produit.points.map((point) => (
              <li key={point} className="flex items-start gap-sm">
                <CheckCircle className="!text-[18px] shrink-0 text-secondary" />
                <span className="text-body-md text-on-surface-variant">{point}</span>
              </li>
            ))}
          </ul>
          <a
            href={`${AUTH_APP_URL}/register`}
            className="mt-lg flex items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm text-body-md font-medium text-on-primary shadow-button transition-opacity hover:opacity-90"
          >
            Essayer gratuitement
            <ArrowForward className="!text-[16px]" />
          </a>
        </div>
      </section>

      <section className="border-t border-outline-soft bg-surface-container-low">
        <div className="mx-auto max-w-6xl px-gutter py-16">
          <h2 className="text-headline-sm font-display text-on-surface">
            D&apos;autres modules à découvrir
          </h2>
          <div className="mt-md grid gap-lg sm:grid-cols-3">
            {autres.map((p) => (
              <ProductCard key={p.slug} produit={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
