import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.AUTH_API_URL;

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const res = await fetch(`${FLASK_URL}/auth/session`, {
    headers: { cookie: cookieHeader },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
