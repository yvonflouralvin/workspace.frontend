import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const BUSINESS_FIRM_MISSIONS_API_URL = process.env.BUSINESS_FIRM_MISSIONS_API_URL!;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; etapeId: string }> }) {
  const { id, etapeId } = await params;
  return forwardToBackend(request, BUSINESS_FIRM_MISSIONS_API_URL, `/bfm/audit/missions/${id}/etapes/${etapeId}`);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; etapeId: string }> }) {
  const { id, etapeId } = await params;
  return forwardToBackend(request, BUSINESS_FIRM_MISSIONS_API_URL, `/bfm/audit/missions/${id}/etapes/${etapeId}`);
}
