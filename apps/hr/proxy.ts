import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export function proxy(request: NextRequest) {

  // Les APK des applications mobiles se téléchargent sans session : on installe
  // l'application pour ouvrir une session, pas l'inverse.
  if (chemin.startsWith("/downloads/")) {
    return NextResponse.next({ request: { headers: entetes } });
  }

  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    return NextResponse.redirect(new URL(process.env.AUTH_API_AUTH_DOMAIN!));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
