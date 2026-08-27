import { NextRequest, NextResponse } from "next/server";

const WEBSITE_API_URL = process.env.WEBSITE_API_URL!;

/** La porte des OCTETS — téléversement de médias et relecture.
 *
 *  Le relais générique (`/api/website`) déchiffre le corps JSON et rechiffre
 *  la réponse : une image n'y survit ni à l'aller (multipart) ni au retour
 *  (binaire). Une seconde porte passe donc les octets tels quels — c'est le
 *  geste déjà pris ailleurs dans le monorepo pour les téléversements.
 */
function chemin(request: NextRequest): string {
  return new URL(request.url).pathname.replace(/^\/api\/website-fichiers/, "") || "/";
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const res = await fetch(`${WEBSITE_API_URL}${chemin(request)}${url.search}`, {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "content-type": request.headers.get("content-type") ?? "",
    },
    body: await request.arrayBuffer(),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const res = await fetch(`${WEBSITE_API_URL}${chemin(request)}${url.search}`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      // Les octets d'un média sont derrière le secret interne côté service ;
      // c'est le BFF qui le porte, jamais le navigateur.
      "X-Internal-Secret": process.env.INTERNAL_SERVICE_SECRET ?? "",
    },
  });
  const entetes = new Headers();
  for (const cle of ["content-type", "content-disposition", "content-length", "cache-control"]) {
    const valeur = res.headers.get(cle);
    if (valeur) entetes.set(cle, valeur);
  }
  return new NextResponse(res.body, { status: res.status, headers: entetes });
}
