import { NextResponse } from "next/server";

const AUTH_API = process.env.AUTH_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API;

export async function GET(request: Request) {
  const { search } = new URL(request.url);

  const backendResponse = await fetch(`${AUTH_API}/auth/login-methods${search}`);
  const data = await backendResponse.json();

  return NextResponse.json(data, { status: backendResponse.status });
}
