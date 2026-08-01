import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// Réponse binaire : pass-through brut, le backend décide de la disposition.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const res = await fetch(`${PROJECTS_API_URL}/formulaires/${id}/fichiers/${documentId}`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  if (!res.ok) return NextResponse.json({ error: "not_found" }, { status: res.status });
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": res.headers.get("content-disposition") ?? "attachment",
    },
  });
}
