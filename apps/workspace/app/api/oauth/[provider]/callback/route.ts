import { NextResponse } from "next/server";

const AUTH_API = process.env.AUTH_API_URL;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { search, origin } = new URL(request.url);

  const backendResponse = await fetch(`${AUTH_API}/auth/oauth/${provider}/callback${search}`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  const data = await backendResponse.json();

  const redirectUrl = new URL("/preferences", origin);
  if (!backendResponse.ok) {
    redirectUrl.searchParams.set("oauth_error", data.message ?? "Connexion impossible");
  }

  return NextResponse.redirect(redirectUrl);
}
