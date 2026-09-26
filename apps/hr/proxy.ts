import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export function proxy(request: NextRequest) {

  // Les APK des applications mobiles se téléchargent sans session : on installe
  // l'application pour ouvrir une session, pas l'inverse.
  if (request.nextUrl.pathname.startsWith("/downloads/")) {
    return NextResponse.next();
  }

  // Nom configurable : une seconde instance sur le même serveur (ex. uat) a son
  // propre nom de cookie pour ne pas lire celui d'une autre instance qui partage
  // le même domaine de cookie (voir COOKIE_NAME_SUFFIX, backends/auth).
  const accessToken = request.cookies.get(process.env.ACCESS_TOKEN_COOKIE_NAME ?? "access_token");

  if (!accessToken) {
    return NextResponse.redirect(new URL(process.env.AUTH_API_AUTH_DOMAIN!));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
