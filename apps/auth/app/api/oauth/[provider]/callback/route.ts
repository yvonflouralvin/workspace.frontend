import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_COOKIE } from "@/app/lib/cookies";

const AUTH_API = process.env.AUTH_API_URL!;
const WORKSPACE_DOMAIN = process.env.WORKSPACE_APP_URL!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { search, origin } = new URL(request.url);

  const backendResponse = await fetch(`${AUTH_API}/auth/oauth/${provider}/callback${search}`);
  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    const errorUrl = new URL("/", origin);
    errorUrl.searchParams.set("oauth_error", data.message ?? "Connexion impossible");
    return NextResponse.redirect(errorUrl);
  }

  const response = NextResponse.redirect(WORKSPACE_DOMAIN);

  response.cookies.set(ACCESS_TOKEN_COOKIE, data.user.access_token, AUTH_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_TOKEN_COOKIE, data.user.refresh_token, AUTH_COOKIE_OPTIONS);

  return response;
}
