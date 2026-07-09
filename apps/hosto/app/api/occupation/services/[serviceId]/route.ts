import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";
const HOSTO_API_URL = process.env.HOSTO_API_URL!;
export async function GET(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/occupation/services/${serviceId}`);
}
