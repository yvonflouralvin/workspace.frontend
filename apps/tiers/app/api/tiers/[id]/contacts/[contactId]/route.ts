import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const TIERS_API_URL = process.env.TIERS_API_URL!;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const { id, contactId } = await params;
  return forwardToBackend(request, TIERS_API_URL, `/tiers/${id}/contacts/${contactId}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const { id, contactId } = await params;
  return forwardToBackend(request, TIERS_API_URL, `/tiers/${id}/contacts/${contactId}`);
}
