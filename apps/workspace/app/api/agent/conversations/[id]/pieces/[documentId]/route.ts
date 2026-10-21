import { NextRequest, NextResponse } from "next/server";

const AGENT_API_URL = process.env.AGENT_API_URL!;

// Réponse BINAIRE : on relaie le flux et les deux en-têtes qui font qu'un
// navigateur sait quoi en faire. Passer par `@repo/network` emballerait les
// octets dans une enveloppe JSON, et le fichier téléchargé serait du base64.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  const reponse = await fetch(
    `${AGENT_API_URL}/agent/conversations/${id}/pieces/${documentId}`,
    { headers: { cookie: request.headers.get("cookie") ?? "" } },
  );

  if (!reponse.ok || !reponse.body) {
    const data = await reponse.json().catch(() => ({ detail: "Pièce introuvable" }));
    return NextResponse.json(data, { status: reponse.status });
  }

  return new NextResponse(reponse.body, {
    status: reponse.status,
    headers: {
      "Content-Type": reponse.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition":
        reponse.headers.get("content-disposition") ?? "attachment",
    },
  });
}
