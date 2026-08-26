import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { RenduChrome, contexteRendu } from "@repo/site-widgets/RenduPage";

import { lireRendu, normaliserHote } from "../lib/rendu";
import { PanierVivant } from "./PanierVivant";

/** Le panier. Chemin réservé, comme `/boutique`. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Panier", robots: { index: false, follow: false } };

export default async function PanierPage() {
  const hote = normaliserHote((await headers()).get("host"));
  const charge = await lireRendu(hote, "/");
  if (!charge) notFound();

  return (
    <RenduChrome charge={charge} contexte={contexteRendu({ theme: charge.site.theme })}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "var(--site-police-titre)", fontSize: 30, margin: 0 }}>
          Votre panier
        </h1>
        {/* Le contenu est chargé par le composant client : il porte les
            cookies, et un rendu serveur du panier obligerait à mettre en cache
            une page qui diffère pour chaque visiteur. */}
        <PanierVivant initial={null} />
      </div>
    </RenduChrome>
  );
}
