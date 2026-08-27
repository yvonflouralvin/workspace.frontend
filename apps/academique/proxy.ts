import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

/** Le chemin demandé, posé dans un en-tête pour le layout racine.
 *
 *  `headers()` ne porte pas le chemin de lui-même, et le layout en a besoin
 *  pour une seule raison : ne pas opposer « accès refusé » à un CANDIDAT.
 *
 *  La page `/candidature/{id}` est la seule d'Academia ouverte sans compte. Un
 *  visiteur anonyme la voit déjà — le layout ne bloque que les sessions
 *  authentifiées sans droit sur Academia. Mais un agent connecté sur un autre
 *  espace, qui clique sur le lien reçu par message, tomberait sur un refus
 *  alors qu'il n'a rien demandé d'interne. C'est ce cas-là qu'on écarte ici.
 *
 *  Aucune redirection : contrairement à `workspace`, Academia ne renvoie pas un
 *  visiteur anonyme vers l'écran de connexion — ce serait fermer la porte
 *  publique qu'on vient d'ouvrir.
 */
export function proxy(request: NextRequest) {
  const entetes = new Headers(request.headers);
  entetes.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: entetes } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
