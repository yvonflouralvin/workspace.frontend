import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HR_API_URL = process.env.HR_API_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return forwardToBackend(request, HR_API_URL, `/hr/employees/${id}/documents`);
}

// Body multipart (upload de fichier) — pas de JSON à chiffrer, même exception que
// les routes OAuth : on bypass @repo/network et on forward les octets bruts.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${HR_API_URL}/hr/employees/${id}/documents`, {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "content-type": request.headers.get("content-type") ?? "",
    },
    body: await request.arrayBuffer(),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
