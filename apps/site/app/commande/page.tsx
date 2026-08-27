import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RenduChrome, contexteRendu } from "@repo/site-widgets/RenduPage";

import { lireRendu, normaliserHote } from "../lib/rendu";
import { FormulaireCommande } from "./Formulaire";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commande",
  robots: { index: false, follow: false },
};

export default async function CommandePage() {
  const hote = normaliserHote((await headers()).get("host"));
  const charge = await lireRendu(hote, "/");
  if (!charge) notFound();

  return (
    <RenduChrome charge={charge} contexte={contexteRendu({ theme: charge.site.theme })}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "var(--site-police-titre)", fontSize: 30, margin: 0 }}>
          Commander
        </h1>
        <FormulaireCommande />
      </div>
    </RenduChrome>
  );
}
