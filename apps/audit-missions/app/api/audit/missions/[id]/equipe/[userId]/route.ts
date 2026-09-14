import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUDIT_MISSIONS_API_URL = process.env.AUDIT_MISSIONS_API_URL!;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params;
  return forwardToBackend(request, AUDIT_MISSIONS_API_URL, `/audit/missions/${id}/equipe/${userId}`);
}
