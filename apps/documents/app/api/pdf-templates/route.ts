import { NextRequest, NextResponse } from "next/server";

const DOCUMENTS_API_URL = process.env.DOCUMENTS_API_URL!;
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const url = `${DOCUMENTS_API_URL}/pdf-templates${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { "X-Internal-Secret": INTERNAL_SERVICE_SECRET },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
