import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

/** Chemins joignables SANS COMPTE.
 *
 *  Le module Form ouvre volontairement une porte : un formulaire public se
 *  remplit par un lien, sans session. Elle est étroite et nommée ici — le
 *  backend décide seul ce qu'il sert derrière un jeton, et ne montre rien du
 *  workspace qui l'héberge.
 *
 *  `/downloads/` sert les APK des applications mobiles. Exiger une session pour
 *  les télécharger serait un cercle : on installe l'application mobile pour
 *  ouvrir une session, pas l'inverse. Ces fichiers ne disent rien du workspace.
 */
const PUBLICS = ["/f/", "/api/public/", "/downloads/"];

export function proxy(request: NextRequest) {
  const chemin = request.nextUrl.pathname;
  // Le layout racine a besoin du chemin pour ne pas rediriger un visiteur
  // anonyme : `headers()` ne le porte pas de lui-même.
  const entetes = new Headers(request.headers);
  entetes.set("x-pathname", chemin);

  if (PUBLICS.some((prefixe) => chemin.startsWith(prefixe))) {
    return NextResponse.next({ request: { headers: entetes } });
  }

  const accessToken = request.cookies.get("access_token");
  if (!accessToken) {
    return NextResponse.redirect(new URL(process.env.AUTH_API_AUTH_DOMAIN!));
  }

  return NextResponse.next({ request: { headers: entetes } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
