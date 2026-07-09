import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const VENTES_API_URL = process.env.VENTES_API_URL!;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ligneId: string }> },
) {
  const { id, ligneId } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/commandes/${id}/lignes/${ligneId}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ligneId: string }> },
) {
  const { id, ligneId } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/commandes/${id}/lignes/${ligneId}`);
}
