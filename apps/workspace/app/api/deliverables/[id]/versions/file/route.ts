import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// Corps multipart (dépôt de fichier) — pas de JSON à chiffrer, même exception que
// l'upload de pièces dans hr : on bypass @repo/network et on forward les octets bruts.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${PROJECTS_API_URL}/deliverables/${id}/versions/file`, {
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
