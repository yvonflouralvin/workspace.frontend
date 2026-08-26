import type { ChargeRendu } from "@repo/site-widgets/RenduPage";

/** Le renderer ne lit JAMAIS la base : tout passe par le service `website`.
 *
 *  C'est ce qui permet d'avoir un seul endroit où se décide ce qu'un inconnu a
 *  le droit de voir — un site suspendu, une page sans version publiée, un
 *  domaine non actif répondent 404 là-bas, et pas ici. */
const API = process.env.WEBSITE_API_URL ?? "http://wd_bk_website:5000";
const SECRET = process.env.INTERNAL_SERVICE_SECRET ?? "";

export function normaliserHote(brut: string | null | undefined): string {
  return (brut ?? "").split(":")[0]!.trim().toLowerCase();
}

export function etiquettes(hote: string, chemin: string): string[] {
  return [`site:${hote}`, `page:${hote}:${chemin}`];
}

export async function lireRendu(
  hote: string,
  chemin: string,
): Promise<ChargeRendu | null> {
  const url = `${API}/public/rendu?hote=${encodeURIComponent(hote)}&chemin=${encodeURIComponent(chemin)}`;
  try {
    const reponse = await fetch(url, {
      headers: { "X-Internal-Secret": SECRET },
      // Le `revalidate` n'est qu'un filet : à la publication, le service
      // appelle /api/revalidate qui purge l'étiquette. La mise en ligne est
      // donc visible en quelques secondes, pas en une heure.
      next: { tags: etiquettes(hote, chemin), revalidate: 3600 },
    });
    if (!reponse.ok) return null;
    return (await reponse.json()) as ChargeRendu;
  } catch {
    return null;
  }
}

export async function lireApercu(
  jeton: string,
  chemin: string,
): Promise<ChargeRendu | null> {
  const url = `${API}/public/apercu/${encodeURIComponent(jeton)}?chemin=${encodeURIComponent(chemin)}`;
  try {
    const reponse = await fetch(url, {
      headers: { "X-Internal-Secret": SECRET },
      // Un aperçu montre le brouillon : le mettre en cache le rendrait faux
      // dès la frappe suivante.
      cache: "no-store",
    });
    if (!reponse.ok) return null;
    return (await reponse.json()) as ChargeRendu;
  } catch {
    return null;
  }
}

export async function lireOctets(
  jeton: string,
): Promise<{ contenu: ArrayBuffer; type: string } | null> {
  try {
    const reponse = await fetch(`${API}/public/medias/${encodeURIComponent(jeton)}`, {
      headers: { "X-Internal-Secret": SECRET },
      next: { revalidate: 86400, tags: [`media:${jeton}`] },
    });
    if (!reponse.ok) return null;
    return {
      contenu: await reponse.arrayBuffer(),
      type: reponse.headers.get("content-type") ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function lireSitemap(
  hote: string,
): Promise<{ hote: string; pages: { chemin: string; modifiee_le: string }[] } | null> {
  try {
    const reponse = await fetch(
      `${API}/public/sitemap?hote=${encodeURIComponent(hote)}`,
      { headers: { "X-Internal-Secret": SECRET }, next: { tags: [`site:${hote}`] } },
    );
    if (!reponse.ok) return null;
    return await reponse.json();
  } catch {
    return null;
  }
}

// ── La boutique ────────────────────────────────────────────────────────────

export interface VariantePublique {
  id: number;
  libelle: string | null;
  prix_centimes: number;
  prix_barre_centimes: number | null;
  devise: string;
  disponible: boolean;
}

export interface ProduitPublic {
  id: number;
  nom: string;
  slug: string;
  resume: string | null;
  description: unknown[] | null;
  images: string[];
  categorie_slug: string | null;
  categorie_nom: string | null;
  prix_min_centimes: number | null;
  prix_max_centimes: number | null;
  devise: string;
  disponible: boolean;
  variantes: VariantePublique[];
  meta_titre: string | null;
  meta_description: string | null;
}

export interface Vitrine {
  site_nom: string;
  categories: { nom: string; slug: string; description: string | null; produits: number }[];
  produits: ProduitPublic[];
  total: number;
}

/** L'étiquette de cache de la boutique.
 *
 *  Distincte de celle des pages : publier une page ne doit pas vider la
 *  vitrine, et changer un prix ne doit pas invalider tout le site. */
export function etiquetteBoutique(hote: string): string {
  return `boutique:${hote}`;
}

async function lireJson<T>(url: string, tags: string[]): Promise<T | null> {
  try {
    const reponse = await fetch(url, {
      headers: { "X-Internal-Secret": SECRET },
      next: { tags, revalidate: 300 },
    });
    if (!reponse.ok) return null;
    return (await reponse.json()) as T;
  } catch {
    return null;
  }
}

export async function lireVitrine(
  hote: string,
  options: { categorie?: string; q?: string; page?: number } = {},
): Promise<Vitrine | null> {
  const params = new URLSearchParams({ hote });
  if (options.categorie) params.set("categorie", options.categorie);
  if (options.q) params.set("q", options.q);
  if (options.page && options.page > 1) params.set("page", String(options.page));
  return lireJson<Vitrine>(`${API}/public/boutique?${params}`, [
    `site:${hote}`,
    etiquetteBoutique(hote),
  ]);
}

export async function lireProduit(hote: string, slug: string): Promise<ProduitPublic | null> {
  const params = new URLSearchParams({ hote, slug });
  return lireJson<ProduitPublic>(`${API}/public/produit?${params}`, [
    `site:${hote}`,
    etiquetteBoutique(hote),
    `produit:${hote}:${slug}`,
  ]);
}

/** Centimes → « 19,99 $ ». La seule conversion de la chaîne. */
export function montant(centimes: number | null | undefined, devise = "USD"): string {
  if (centimes === null || centimes === undefined) return "";
  const signe = devise === "USD" ? "$" : devise === "EUR" ? "€" : devise;
  return `${(centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${signe}`;
}
