import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ encounterId: string }> }) {
  const { encounterId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/sejours/admettre-depuis-encounter/${encounterId}`);
}
