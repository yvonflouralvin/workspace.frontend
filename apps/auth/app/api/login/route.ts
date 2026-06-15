import { NextResponse } from "next/server";

const AUTH_API = process.env.AUTH_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API;

export async function POST(request: Request) {
  const body = await request.json();

  const backendResponse = await fetch(`${AUTH_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  const response = NextResponse.json({ user: { email: data.user.email } });

  response.cookies.set("access_token", data.user.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  response.cookies.set("refresh_token", data.user.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
