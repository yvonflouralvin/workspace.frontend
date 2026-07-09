import { NextRequest } from "next/server";

const VENTES_API_URL = process.env.VENTES_API_URL!;

// Réponse binaire (PDF) : on ne passe pas par forwardToBackend (qui chiffre du JSON).
// On relaie le cookie de session pour que le backend vérifie la permission.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${VENTES_API_URL}/factures/${id}/pdf`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new Response(text || "Erreur lors de la génération du PDF", { status: res.status });
  }
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="facture-${id}.pdf"`,
    },
  });
}
