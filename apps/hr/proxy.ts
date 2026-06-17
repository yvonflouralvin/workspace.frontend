import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export function proxy(request: NextRequest) {

  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN!));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
