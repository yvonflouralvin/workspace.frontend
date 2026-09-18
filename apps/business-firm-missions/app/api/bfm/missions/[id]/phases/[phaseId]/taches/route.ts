import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const BUSINESS_FIRM_MISSIONS_API_URL = process.env.BUSINESS_FIRM_MISSIONS_API_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; phaseId: string }> }) {
  const { id, phaseId } = await params;
  return forwardToBackend(request, BUSINESS_FIRM_MISSIONS_API_URL, `/bfm/missions/${id}/phases/${phaseId}/taches`);
}
