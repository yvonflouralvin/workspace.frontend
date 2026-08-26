import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RenduPage, contexteRendu } from "@repo/site-widgets/RenduPage";

import { lireRendu, normaliserHote } from "../lib/rendu";

/** UNE seule route attrape tout.
 *
 *  Conséquence directe : ajouter une page ou brancher un domaine ne demande
 *  aucun redéploiement. La configuration est une donnée — c'est le même
 *  principe que le bloc attrape-tout de nginx. */

export const dynamic = "force-dynamic";

async function charger(params: Promise<{ chemin?: string[] }>) {
  const hote = normaliserHote((await headers()).get("host"));
  const chemin = "/" + ((await params).chemin ?? []).join("/");
  return { hote, chemin, charge: await lireRendu(hote, chemin.replace(/\/+$/, "") || "/") };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chemin?: string[] }>;
}): Promise<Metadata> {
  const { charge, chemin } = await charger(params);
  if (!charge) return { title: "Page introuvable" };

  const canonique = charge.domaine_principal
    ? `https://${charge.domaine_principal}${chemin === "/" ? "" : chemin}`
    : undefined;

  return {
    title: charge.page.titre,
    description: charge.page.description ?? undefined,
    // Le canonique sort TOUJOURS du domaine principal : c'est ce qui rend
    // inoffensif de servir à la fois exemple.cd et www.exemple.cd.
    alternates: canonique ? { canonical: canonique } : undefined,
    robots: charge.page.indexable ? undefined : { index: false, follow: false },
    icons: charge.site.favicon ? { icon: `/_media/${charge.site.favicon}` } : undefined,
    openGraph: {
      title: charge.page.titre,
      description: charge.page.description ?? undefined,
      url: canonique,
      siteName: charge.site.nom,
      images: charge.page.image_og ? [`/_media/${charge.page.image_og}`] : undefined,
      locale: charge.site.langue,
      type: "website",
    },
  };
}

export default async function PagePublique({
  params,
}: {
  params: Promise<{ chemin?: string[] }>;
}) {
  const { charge } = await charger(params);
  if (!charge) notFound();

  return (
    <RenduPage
      charge={charge}
      contexte={contexteRendu({ theme: charge.site.theme, baseMedia: "/_media" })}
    />
  );
}
