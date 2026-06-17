import { NextRequest, NextResponse } from "next/server";

const FLASK_URL = process.env.AUTH_API_URL;

export async function forwardToAuthApi(request: NextRequest, path: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const init: RequestInit = {
    method: request.method,
    headers: { cookie: cookieHeader },
  };

  if (request.method !== "GET" && request.method !== "DELETE") {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = await request.text();
  }

  const res = await fetch(`${FLASK_URL}${path}`, init);
  const data = await res.json().catch(() => ({}));

  return NextResponse.json(data, { status: res.status });
}
