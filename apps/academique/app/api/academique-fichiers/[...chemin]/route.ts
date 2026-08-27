import { NextRequest, NextResponse } from "next/server";

const ACADEMIQUE_API_URL = process.env.ACADEMIQUE_API_URL!;

/** La porte des FICHIERS d'Academia — octets bruts, dans les deux sens.
 *
 *  Le relais générique (`/api/academique`) déchiffre le corps JSON et rechiffre
 *  la réponse : un classeur Excel n'y survit ni à l'aller (multipart) ni au
 *  retour (binaire). Une seconde porte, plus spécifique, passe donc les octets
 *  tels quels — c'est le geste déjà pris ailleurs dans le monorepo pour les
 *  téléversements (cf. `apps/sgr/.../pieces/route.ts`).
 *
 *  Elle ne décide de rien : le service tranche les droits, comme sur l'autre
 *  porte.
 */
function chemin(request: NextRequest): string {
  return new URL(request.url).pathname.replace(/^\/api\/academique-fichiers/, "") || "/";
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const res = await fetch(`${ACADEMIQUE_API_URL}${chemin(request)}${url.search}`, {
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
  const res = await fetch(`${ACADEMIQUE_API_URL}${chemin(request)}${url.search}`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  // Le corps est relayé tel quel : `Content-Disposition` porte le nom du
  // fichier, et le réécrire ici ferait deux endroits à tenir d'accord.
  const entetes = new Headers();
  for (const cle of ["content-type", "content-disposition", "content-length"]) {
    const valeur = res.headers.get(cle);
    if (valeur) entetes.set(cle, valeur);
  }
  return new NextResponse(res.body, { status: res.status, headers: entetes });
}
