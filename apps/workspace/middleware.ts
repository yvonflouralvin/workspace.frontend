import {NextResponse} from "next/server";
import {NextRequest} from "next/server";

export function middleware(request: NextRequest) {

  const accessToken = request.cookies.get("access_token");
  const isAuthPage = request.nextUrl.pathname.startsWith(`${process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN}/auth`);

  if (!accessToken && !isAuthPage){
    return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN}/auth`,request.url));
  }

  return NextResponse.next();
}