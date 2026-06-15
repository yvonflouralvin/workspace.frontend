import { NextResponse } from "next/server";

const AUTH_API = process.env.AUTH_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API;

export async function POST(request: Request) {
  const body = await request.json();

  const backendResponse = await fetch(`${AUTH_API}/auth/check-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendResponse.json();

  return NextResponse.json(data, { status: backendResponse.status });
}
