import { headers } from "next/headers";

import { lireSitemap, normaliserHote } from "../lib/rendu";

export const dynamic = "force-dynamic";

function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const hote = normaliserHote((await headers()).get("host"));
  const plan = await lireSitemap(hote);
  if (!plan) return new Response("Introuvable", { status: 404 });

  const urls = plan.pages
    .map((page) => {
      const url = `https://${plan.hote}${page.chemin === "/" ? "" : page.chemin}`;
      return `<url><loc>${echapper(url)}</loc><lastmod>${echapper(page.modifiee_le)}</lastmod></url>`;
    })
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
