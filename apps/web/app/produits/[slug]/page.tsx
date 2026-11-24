import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "@mui/icons-material";
import { produits, getProduit } from "../../../lib/produits";
import { ProduitIcon } from "../../../components/icon-map";
import { ProductCard } from "../../../components/ProductCard";
import { lienAuth } from "../../../components/nav-links";
import { Bouton, Fleche } from "../../../components/Bouton";
import { Section, Entete } from "../../../components/Section";
import { Captures } from "../../../components/Captures";
import { capturesDe } from "../../../lib/captures";
import { Reveal } from "../../../components/Reveal";
import { BoucleAgent } from "../../../components/visuels/BoucleAgent";

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
  // LE SCHÉMA DE LA DÉLÉGATION N'A DE SENS QUE SUR UNE FICHE. L'afficher
  // partout en ferait une décoration ; ici il explique le module dont la
  // page parle.
  const montreBoucle = produit.slug === "collaborateurs-virtuels";
  // LES CAPTURES SONT DE VRAIS ÉCRANS, pris sur un espace de démonstration
  // peuplé pour l'occasion. Un module qui n'en a pas encore n'affiche
  // simplement pas la section — plutôt qu'un cadre vide qui ferait croire à
  // un écran manquant.
  const vues = capturesDe(produit.slug);

  return (
    <>
      {/* Le haut de page est sombre, comme toutes les pages du site : la
          barre du haut en dépend (voir le commentaire de `Header`). */}
      <section className="nuit nuit-grille nuit-halo relative overflow-hidden">
        <span
          aria-hidden="true"
          className="anim-halo pointer-events-none absolute left-1/4 top-[-12rem] h-[30rem] w-[30rem] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--halo-indigo) 50%, transparent), transparent 65%)",
          }}
        />
        <div className="ouverture relative mx-auto max-w-6xl px-gutter pb-xl md:pb-20">
          <Reveal>
            <Link
              href="/produits"
              className="text-body-sm font-medium text-[color:var(--nuit-texte-doux)] transition-colors hover:text-[color:var(--nuit-texte)]"
            >
              ← Tous les modules
            </Link>

            <div className="mt-lg flex flex-col gap-lg sm:flex-row sm:items-start">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--nuit-filet)] bg-[color:var(--nuit-carte)] text-[color:var(--color-primary-fixed-dim)]">
                <ProduitIcon nom={produit.icone} className="!text-[32px]" />
              </span>
              <div className="min-w-0">
                <p className="text-label-sm uppercase text-[color:var(--nuit-texte-doux)]">
                  {produit.categorie}
                </p>
                <h1 className="mt-sm font-display text-[2.25rem] leading-[1.08] font-bold tracking-[-0.03em] text-[color:var(--nuit-texte)] md:text-[3rem]">
                  {produit.nom}
                </h1>
                <p className="mt-md max-w-2xl text-body-lg leading-relaxed text-[color:var(--nuit-texte-doux)] md:text-[1.0625rem]">
                  {produit.accroche}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {montreBoucle && (
        <Section registre="nuit" motif taille="sm">
          <Reveal>
            <div className="carte-nuit rounded-2xl p-lg md:p-xl">
              <BoucleAgent />
            </div>
          </Reveal>
        </Section>
      )}

      <Section registre="clair">
        <div className="grid gap-xl lg:grid-cols-[1.6fr_1fr]">
          <Reveal>
            <h2 className="text-label-sm uppercase text-primary">Présentation</h2>
            <p className="mt-md text-body-lg leading-relaxed text-on-surface-variant md:text-[1.0625rem]">
              {produit.description}
            </p>
          </Reveal>

          <Reveal delai={120}>
            <div className="sticky top-24 rounded-2xl border border-outline-soft bg-surface-container-low p-lg shadow-card">
              <h2 className="font-display text-headline-sm text-on-surface">Ce module inclut</h2>
              <ul className="mt-md flex flex-col gap-md">
                {produit.points.map((point) => (
                  <li key={point} className="flex items-start gap-sm">
                    <CheckCircle className="!text-[18px] shrink-0 text-secondary" />
                    <span className="text-body-md leading-relaxed text-on-surface-variant">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
              <Bouton
                href={lienAuth("/register")}
                externe
                className="mt-lg w-full"
              >
                Essayer gratuitement
                <Fleche />
              </Bouton>
              <p className="mt-sm text-center text-body-sm text-on-surface-variant">
                Sans engagement, et activable seul.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {vues.length > 0 && (
        <Section registre="nuit" motif>
          <Entete
            sombre
            surtitre="En conditions réelles"
            titre={
              <>
                Voici l&apos;écran. <span className="titre-degrade">Pas une maquette.</span>
              </>
            }
            chapeau="Ces captures viennent d'un espace de travail réel, peuplé de douze mois d'activité d'une entreprise de distribution. Rien n'a été dessiné pour la circonstance."
          />
          <div className="mt-xl md:mt-20">
            <Captures captures={vues} sombre />
          </div>
        </Section>
      )}

      <Section registre="creux">
        <Reveal>
          <h2 className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-on-surface md:text-[2rem]">
            D&apos;autres modules, sur le même socle
          </h2>
        </Reveal>
        <div className="mt-xl grid gap-lg sm:grid-cols-3">
          {autres.map((p, i) => (
            <Reveal key={p.slug} delai={i * 80}>
              <ProductCard produit={p} />
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
