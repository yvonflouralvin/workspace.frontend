import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const TIERS_API_URL = process.env.TIERS_API_URL!;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; echangeId: string }> }) {
  const { id, echangeId } = await params;
  return forwardToBackend(request, TIERS_API_URL, `/tiers/${id}/echanges/${echangeId}`);
}
