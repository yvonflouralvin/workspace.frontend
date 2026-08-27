import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RenduPage, contexteRendu } from "@repo/site-widgets/RenduPage";

import { lireApercu } from "../../../lib/rendu";

export const dynamic = "force-dynamic";

/** Toujours hors index, quoi que dise la page. Un brouillon qui se retrouve
 *  dans un moteur de recherche y reste bien après qu'on l'a corrigé. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Apercu({
  params,
}: {
  params: Promise<{ jeton: string; chemin?: string[] }>;
}) {
  const { jeton, chemin } = await params;
  const charge = await lireApercu(jeton, "/" + (chemin ?? []).join("/"));
  if (!charge) notFound();

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#f59e0b",
          color: "#1c1917",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        Aperçu du brouillon — ce n'est pas ce que voient vos visiteurs.
      </div>
      <RenduPage
        charge={charge}
        contexte={contexteRendu({ theme: charge.site.theme, baseMedia: "/_media" })}
      />
    </>
  );
}
