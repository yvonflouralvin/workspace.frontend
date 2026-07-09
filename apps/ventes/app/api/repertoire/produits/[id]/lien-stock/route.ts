import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const VENTES_API_URL = process.env.VENTES_API_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/repertoire/produits/${id}/lien-stock`);
}
