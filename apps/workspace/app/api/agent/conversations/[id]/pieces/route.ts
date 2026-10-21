import { NextRequest, NextResponse } from "next/server";

const AGENT_API_URL = process.env.AGENT_API_URL!;

// Corps multipart : aucun JSON à chiffrer, donc on relaie les octets bruts —
// même exception que l'upload de documents de `hr`. `@repo/network` chiffre un
// objet, pas un fichier, et le faire passer par là le corromprait.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reponse = await fetch(`${AGENT_API_URL}/agent/conversations/${id}/pieces`, {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "content-type": request.headers.get("content-type") ?? "",
    },
    body: await request.arrayBuffer(),
  });
  const data = await reponse.json().catch(() => ({}));
  return NextResponse.json(data, { status: reponse.status });
}
