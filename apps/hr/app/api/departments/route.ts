import { NextRequest, NextResponse } from "next/server";

const HR_API_URL = process.env.HR_API_URL;

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  const res = await fetch(`${HR_API_URL}/hr/departments`, {
    headers: { cookie: cookieHeader },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
