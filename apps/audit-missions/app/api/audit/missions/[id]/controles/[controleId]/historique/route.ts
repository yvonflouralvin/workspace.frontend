import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUDIT_MISSIONS_API_URL = process.env.AUDIT_MISSIONS_API_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; controleId: string }> },
) {
  const { id, controleId } = await params;
  return forwardToBackend(
    request,
    AUDIT_MISSIONS_API_URL,
    `/audit/missions/${id}/controles/${controleId}/historique`,
  );
}
