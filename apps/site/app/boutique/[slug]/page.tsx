import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RenduChrome, contexteRendu } from "@repo/site-widgets/RenduPage";
import { RichText } from "@repo/site-widgets/RichText";

import { lireProduit, lireRendu, montant, normaliserHote } from "../../lib/rendu";
import { AjoutPanier } from "./AjoutPanier";

/** La fiche d'un produit.
 *
 *  La description longue est un document BlockNote, sérialisé en JSX par le
 *  même convertisseur que le texte riche des pages : **jamais**
 *  `dangerouslySetInnerHTML`. Un catalogue est alimenté par des gens qui
 *  collent du contenu venu d'ailleurs, et cette page vit sur le domaine du
 *  client.
 */

export const dynamic = "force-dynamic";

async function charger(params: Promise<{ slug: string }>) {
  const hote = normaliserHote((await headers()).get("host"));
  const { slug } = await params;
  const [charge, produit] = await Promise.all([lireRendu(hote, "/"), lireProduit(hote, slug)]);
  return { charge, produit };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { produit } = await charger(params);
  if (!produit) return { title: "Article introuvable" };
  return {
    title: produit.meta_titre ?? produit.nom,
    description: produit.meta_description ?? produit.resume ?? undefined,
    openGraph: {
      title: produit.meta_titre ?? produit.nom,
      description: produit.meta_description ?? produit.resume ?? undefined,
      images: produit.images[0] ? [{ url: `/_media/${produit.images[0]}` }] : undefined,
    },
  };
}

export default async function FicheProduitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { charge, produit } = await charger(params);
  if (!charge || !produit) notFound();

  const contexte = contexteRendu({ theme: charge.site.theme });
  // La variante qui porte le prix affiché — et donc le seul prix barré qu'on
  // ait le droit de montrer à côté. Prendre la première venue barrerait un
  // montant qui n'est pas celui qu'on annonce.
  const prix =
    produit.variantes.find((v) => v.prix_centimes === produit.prix_min_centimes) ??
    produit.variantes[0];

  // Données structurées : c'est ce qui met un prix et une disponibilité dans
  // le résultat de recherche au lieu d'un titre nu. Sérialisées par
  // `JSON.stringify` — jamais concaténées à la main : une apostrophe dans un
  // nom de produit suffirait à casser le script, et à en ouvrir un autre.
  const donneesStructurees = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produit.nom,
    description: produit.meta_description ?? produit.resume ?? undefined,
    image: produit.images.map((jeton) => `/_media/${jeton}`),
    offers: {
      "@type": "Offer",
      price: ((produit.prix_min_centimes ?? 0) / 100).toFixed(2),
      priceCurrency: produit.devise,
      availability: produit.disponible
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <RenduChrome charge={charge} contexte={contexte}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(donneesStructurees).replace(/</g, "\\u003c"),
        }}
      />
      <div style={{ maxWidth: "var(--site-largeur)", margin: "0 auto", padding: "40px 24px" }}>
        <nav style={{ fontSize: 14, color: "var(--site-texte-doux)" }}>
          <a href="/boutique" style={{ color: "inherit" }}>
            Boutique
          </a>
          {produit.categorie_slug && (
            <>
              {" › "}
              <a href={`/boutique?rayon=${produit.categorie_slug}`} style={{ color: "inherit" }}>
                {produit.categorie_nom}
              </a>
            </>
          )}
        </nav>

        <div
          style={{
            display: "grid",
            gap: 40,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            marginTop: 24,
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                aspectRatio: "1 / 1",
                background: "rgba(0,0,0,.04)",
                borderRadius: "var(--site-rayon)",
                overflow: "hidden",
              }}
            >
              {produit.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/_media/${produit.images[0]}`}
                  alt={produit.nom}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </span>
            {produit.images.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {produit.images.slice(1).map((jeton) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={jeton}
                    src={`/_media/${jeton}`}
                    alt=""
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h1
              style={{
                fontFamily: "var(--site-police-titre)",
                fontSize: 30,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {produit.nom}
            </h1>
            {produit.resume && (
              <p style={{ color: "var(--site-texte-doux)", marginTop: 8 }}>{produit.resume}</p>
            )}

            <AjoutPanier variantes={produit.variantes} devise={produit.devise} />

            {prix?.prix_barre_centimes ? (
              <p
                style={{
                  marginTop: 8,
                  color: "var(--site-texte-doux)",
                  textDecoration: "line-through",
                }}
              >
                {montant(prix.prix_barre_centimes, produit.devise)}
              </p>
            ) : null}
          </div>
        </div>

        {produit.description ? (
          <div style={{ marginTop: 40, maxWidth: "68ch" }}>
            <RichText blocs={produit.description} />
          </div>
        ) : null}
      </div>
    </RenduChrome>
  );
}
