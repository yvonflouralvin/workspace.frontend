import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUTH_API_URL = process.env.AUTH_API_URL!;

/** LE RELAIS, ET RIEN D'AUTRE.
 *
 *  Trois apps effaçaient les cookies elles-mêmes, avec
 *  `response.cookies.delete(nom)` — sans le domaine. Or la connexion les pose
 *  AVEC (`COOKIE_DOMAIN`, `.saas.cd` sur une instance client) : un cookie de
 *  domaine ne s'efface pas par un `Set-Cookie` qui n'en porte pas, le
 *  navigateur y voit deux cookies différents. La déconnexion ne faisait donc
 *  rien, partout où `COOKIE_DOMAIN` est renseigné — c'est-à-dire chez tous les
 *  clients, et jamais en local, où il est vide. D'où un défaut invisible au
 *  développement.
 *
 *  `forwardToBackend` rend au navigateur les `Set-Cookie` du service, qui
 *  efface avec le nom, le domaine et le chemin dont il s'est servi pour
 *  poser. Une seule vérité, celle de qui a posé le cookie.
 */
export async function POST(request: NextRequest) {
  return forwardToBackend(request, AUTH_API_URL, "/auth/logout");
}
