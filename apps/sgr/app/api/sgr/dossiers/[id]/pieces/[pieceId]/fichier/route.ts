import { NextRequest } from "next/server";

const SGR_API_URL = process.env.SGR_API_URL!;

/** Téléchargement d'une pièce — réponse binaire, donc pass-through brut. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pieceId: string }> }
) {
  const { id, pieceId } = await params;
  const res = await fetch(`${SGR_API_URL}/dossiers/${id}/pieces/${pieceId}/fichier`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": res.headers.get("content-disposition") ?? "inline",
    },
  });
}
