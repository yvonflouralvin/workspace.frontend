import { NextRequest } from "next/server";
import { decryptRequestBody, encryptResponseBody, toBadRequestResponse } from "@repo/network/server";
import { THEMES_SITE, entetePourTheme, piedPourTheme, resoudreImagesTheme, type ThemeSite } from "@repo/site-widgets/themes";

const WEBSITE_API_URL = process.env.WEBSITE_API_URL!;

interface Corps {
  themeCle: string;
  nom: string;
  slug?: string;
}

/** Crée un site ENTIER à partir d'un thème : pages, images, menu, couleurs —
 *  tout d'un coup, publié.
 *
 *  **Pourquoi une route dédiée, et pas une succession d'appels depuis le
 *  navigateur.** Un thème téléverse ses images depuis des URL externes
 *  (Unsplash) : un fetch client vers un domaine tiers, puis un renvoi vers
 *  notre propre API, marche mais traîne CORS et la taille du transfert
 *  jusqu'au poste du visiteur. Fait ici, côté serveur, c'est un aller simple
 *  — et le thème (`@repo/site-widgets/themes`) reste la SEULE source de
 *  vérité sur ce qu'il construit, que ce soit posé à la main dans l'éditeur
 *  ou appliqué d'un coup à la création.
 *
 *  **Best-effort, pas transactionnel.** Le site est déjà créé quand la
 *  première image part en erreur : on ne laisse pas un site à moitié écrit
 *  derrière soi, on le supprime et on remonte l'erreur telle quelle.
 */
export async function POST(request: NextRequest) {
  let corps: Corps;
  try {
    corps = await decryptRequestBody<Corps>(request);
  } catch (error) {
    return toBadRequestResponse(error);
  }

  const theme = THEMES_SITE.find((t) => t.cle === corps.themeCle);
  if (!theme) {
    return encryptResponseBody({ message: `Thème inconnu : ${corps.themeCle}` }, { status: 404 });
  }
  if (!corps.nom?.trim()) {
    return encryptResponseBody({ message: "Le nom du site est requis." }, { status: 422 });
  }

  const cookie = request.headers.get("cookie") ?? "";
  let siteId: number | undefined;

  try {
    const site = await appelJson<{ id: number }>("POST", "/sites", cookie, {
      nom: corps.nom.trim(),
      slug: corps.slug || undefined,
      langue: "fr",
    });
    siteId = site.id;

    const jetons = await televerserImages(siteId, theme, cookie);

    const pagesExistantes = await appelJson<{ id: number; chemin: string; revision: number }[]>(
      "GET",
      `/sites/${siteId}/pages`,
      cookie,
    );

    for (const def of theme.pages) {
      let page = pagesExistantes.find((p) => p.chemin === def.chemin);
      if (!page) {
        page = await appelJson<{ id: number; chemin: string; revision: number }>("POST", `/sites/${siteId}/pages`, cookie, {
          chemin: def.chemin,
          titre: def.titre,
          est_accueil: !!def.estAccueil,
          indexable: true,
        });
      }
      const arbre = resoudreImagesTheme(def.construire(), jetons);
      await appelJson("PUT", `/pages/${page.id}/brouillon`, cookie, { revision: page.revision, arbre });
    }

    const entete = resoudreImagesTheme(entetePourTheme(theme), jetons);
    const pied = resoudreImagesTheme(piedPourTheme(theme), jetons);
    await appelJson("PATCH", `/sites/${siteId}`, cookie, {
      theme_brouillon: theme.couleurs,
      entete_brouillon: entete,
      pied_brouillon: pied,
    });

    await appelJson("POST", `/sites/${siteId}/publier`, cookie, {});

    const siteFinal = await appelJson("GET", `/sites/${siteId}`, cookie);
    return encryptResponseBody(siteFinal, { status: 201 });
  } catch (error) {
    if (siteId) {
      await fetch(`${WEBSITE_API_URL}/sites/${siteId}`, { method: "DELETE", headers: { Cookie: cookie } }).catch(() => {});
    }
    const message = error instanceof Error ? error.message : "Impossible d'appliquer ce thème.";
    return encryptResponseBody({ message }, { status: 502 });
  }
}

async function appelJson<T = Record<string, unknown>>(
  methode: string,
  chemin: string,
  cookie: string,
  corps?: unknown,
): Promise<T> {
  const res = await fetch(`${WEBSITE_API_URL}${chemin}`, {
    method: methode,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  });
  if (!res.ok) {
    const texte = await res.text().catch(() => "");
    throw new Error(`${methode} ${chemin} a échoué (${res.status}) : ${texte.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("json") ? res.json() : ({} as T);
}

async function televerserImages(siteId: number, theme: ThemeSite, cookie: string): Promise<Record<string, string>> {
  const jetons: Record<string, string> = {};
  for (const [cle, { url, alt }] of Object.entries(theme.images)) {
    const image = await fetch(url);
    if (!image.ok) throw new Error(`Téléchargement de l'image « ${cle} » impossible (${image.status}).`);
    const octets = await image.arrayBuffer();

    const form = new FormData();
    form.append("fichier", new Blob([octets], { type: "image/jpeg" }), `${cle}.jpg`);
    form.append("alt", alt);

    const res = await fetch(`${WEBSITE_API_URL}/sites/${siteId}/medias`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });
    if (!res.ok) {
      const texte = await res.text().catch(() => "");
      throw new Error(`Téléversement de l'image « ${cle} » refusé (${res.status}) : ${texte.slice(0, 300)}`);
    }
    const lu = (await res.json()) as { jeton: string };
    jetons[cle] = lu.jeton;
  }
  return jetons;
}
