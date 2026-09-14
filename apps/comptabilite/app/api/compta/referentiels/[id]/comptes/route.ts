import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const COMPTABILITE_API_URL = process.env.COMPTABILITE_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, COMPTABILITE_API_URL, `/compta/referentiels/${id}/comptes`);
}
