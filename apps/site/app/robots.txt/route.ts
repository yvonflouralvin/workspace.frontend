import { headers } from "next/headers";

import { lireRendu, normaliserHote } from "../lib/rendu";

export const dynamic = "force-dynamic";

export async function GET() {
  const hote = normaliserHote((await headers()).get("host"));
  const charge = await lireRendu(hote, "/");

  // Un hôte qui ne mène à aucun site publié ne doit pas être exploré : sans
  // ce cas, un domaine à moitié branché inviterait les robots à indexer des
  // 404.
  if (!charge) {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain" },
    });
  }

  const lignes = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /_apercu/",
    `Sitemap: https://${charge.domaine_principal ?? hote}/sitemap.xml`,
    "",
  ];
  return new Response(lignes.join("\n"), { headers: { "Content-Type": "text/plain" } });
}
