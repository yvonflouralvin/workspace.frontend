import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const COMPTABILITE_API_URL = process.env.COMPTABILITE_API_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, COMPTABILITE_API_URL, `/compta/ecritures/${id}/contre-passer`);
}
