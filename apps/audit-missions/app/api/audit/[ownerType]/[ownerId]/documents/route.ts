import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUDIT_MISSIONS_API_URL = process.env.AUDIT_MISSIONS_API_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ownerType: string; ownerId: string }> },
) {
  const { ownerType, ownerId } = await params;
  return forwardToBackend(request, AUDIT_MISSIONS_API_URL, `/audit/${ownerType}/${ownerId}/documents`);
}

// Body multipart (upload de fichier) — pas de JSON à chiffrer, même exception que
// les routes OAuth et les documents RH : on bypass @repo/network, octets bruts.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ownerType: string; ownerId: string }> },
) {
  const { ownerType, ownerId } = await params;
  const res = await fetch(`${AUDIT_MISSIONS_API_URL}/audit/${ownerType}/${ownerId}/documents`, {
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
