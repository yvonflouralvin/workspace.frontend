import { NextResponse } from "next/server";

const AUTH_API = process.env.AUTH_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { search } = new URL(request.url);

  const backendResponse = await fetch(`${AUTH_API}/auth/oauth/${provider}/start${search}`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  return NextResponse.redirect(data.authorize_url);
}
