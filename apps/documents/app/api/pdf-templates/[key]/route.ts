import { NextRequest, NextResponse } from "next/server";

const DOCUMENTS_API_URL = process.env.DOCUMENTS_API_URL!;
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET!;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const res = await fetch(`${DOCUMENTS_API_URL}/pdf-templates/${key}`, {
    headers: { "X-Internal-Secret": INTERNAL_SERVICE_SECRET },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
