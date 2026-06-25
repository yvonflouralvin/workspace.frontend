import { NextRequest } from "next/server";

const APPROVAL_FLOWS_API_URL = process.env.APPROVAL_FLOWS_API_URL!;

// Réponse binaire — pas de JSON à chiffrer, même exception que les routes OAuth :
// pass-through brut des octets + headers. Appelée par navigation directe du
// navigateur (<a href>), les cookies sont donc déjà présents sur la requête entrante.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  const res = await fetch(
    `${APPROVAL_FLOWS_API_URL}/approval-flows/requests/${id}/attachments/${documentId}`,
    { headers: { cookie: request.headers.get("cookie") ?? "" } }
  );

  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": res.headers.get("content-disposition") ?? "",
    },
  });
}
