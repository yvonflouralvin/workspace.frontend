import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const VENTES_API_URL = process.env.VENTES_API_URL!;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paiementId: string }> },
) {
  const { id, paiementId } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/factures/${id}/paiements/${paiementId}`);
}
