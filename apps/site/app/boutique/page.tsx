import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RenduChrome, contexteRendu } from "@repo/site-widgets/RenduPage";

import { lireRendu, lireVitrine, montant, normaliserHote } from "../lib/rendu";

/** La vitrine.
 *
 *  **`/boutique` est un chemin RÉSERVÉ** : cette route l'emporte sur
 *  l'attrape-tout qui sert les pages du builder. Une page nommée `/boutique`
 *  serait donc invisible — c'est le prix d'un chemin fixe, et il est payé en
 *  connaissance de cause : une adresse stable pour la boutique vaut mieux
 *  qu'une adresse que chaque client choisirait et que rien ne pourrait lier.
 *
 *  La coque — en-tête, pied, thème — vient du MÊME rendu que les pages : c'est
 *  la raison d'être de `RenduChrome`. Recopier le thème ici l'aurait fait
 *  diverger à la première retouche.
 */

export const dynamic = "force-dynamic";

async function charger(recherche: Promise<Record<string, string | string[] | undefined>>) {
  const hote = normaliserHote((await headers()).get("host"));
  const params = await recherche;
  const lire = (cle: string) => {
    const valeur = params[cle];
    return Array.isArray(valeur) ? valeur[0] : valeur;
  };
  const [charge, vitrine] = await Promise.all([
    lireRendu(hote, "/"),
    lireVitrine(hote, {
      categorie: lire("rayon"),
      q: lire("q"),
      page: Number(lire("page") ?? 1) || 1,
    }),
  ]);
  return { hote, charge, vitrine, rayon: lire("rayon"), q: lire("q") };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { vitrine } = await charger(searchParams);
  if (!vitrine) return { title: "Boutique" };
  return {
    title: `Boutique — ${vitrine.site_nom}`,
    description: `Les articles de ${vitrine.site_nom}.`,
  };
}

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { charge, vitrine, rayon, q } = await charger(searchParams);
  if (!charge || !vitrine) notFound();

  const contexte = contexteRendu({ theme: charge.site.theme });

  return (
    <RenduChrome charge={charge} contexte={contexte}>
      <div style={{ maxWidth: "var(--site-largeur)", margin: "0 auto", padding: "48px 24px" }}>
        <h1
          style={{
            fontFamily: "var(--site-police-titre)",
            fontSize: 34,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Boutique
        </h1>

        {vitrine.categories.length > 0 && (
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
            <a href="/boutique" style={pastille(!rayon)}>
              Tout ({vitrine.total})
            </a>
            {vitrine.categories.map((c) => (
              <a key={c.slug} href={`/boutique?rayon=${c.slug}`} style={pastille(rayon === c.slug)}>
                {c.nom} ({c.produits})
              </a>
            ))}
          </nav>
        )}

        {vitrine.produits.length === 0 ? (
          <p style={{ marginTop: 40, color: "var(--site-texte-doux)" }}>
            {q ? `Aucun article ne correspond à « ${q} ».` : "Aucun article pour l'instant."}
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "28px 0 0",
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            }}
          >
            {vitrine.produits.map((p) => (
              <li key={p.id}>
                <a href={`/boutique/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      display: "block",
                      aspectRatio: "1 / 1",
                      background: "rgba(0,0,0,.04)",
                      borderRadius: "var(--site-rayon)",
                      overflow: "hidden",
                    }}
                  >
                    {p.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/_media/${p.images[0]}`}
                        alt={p.nom}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </span>
                  <span style={{ display: "block", marginTop: 10, fontWeight: 600 }}>{p.nom}</span>
                  {p.resume && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        fontSize: 14,
                        color: "var(--site-texte-doux)",
                      }}
                    >
                      {p.resume}
                    </span>
                  )}
                  <span style={{ display: "block", marginTop: 6, fontWeight: 600 }}>
                    {p.prix_min_centimes !== p.prix_max_centimes ? "dès " : ""}
                    {montant(p.prix_min_centimes, p.devise)}
                  </span>
                  {!p.disponible && (
                    <span style={{ fontSize: 13, color: "var(--site-texte-doux)" }}>
                      Momentanément indisponible
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RenduChrome>
  );
}

function pastille(actif: boolean) {
  return {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 14,
    textDecoration: "none",
    background: actif ? "var(--site-primaire)" : "rgba(0,0,0,.05)",
    color: actif ? "#fff" : "inherit",
  } as const;
}
