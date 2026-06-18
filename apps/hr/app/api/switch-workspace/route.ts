import { NextRequest, NextResponse } from "next/server";

const AUTH_API_URL = process.env.AUTH_API_URL;

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const res = await fetch(`${AUTH_API_URL}/auth/switch-workspace`, {
    method: "POST",
    headers: { cookie: cookieHeader, "Content-Type": "application/json" },
    body: await request.text(),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
