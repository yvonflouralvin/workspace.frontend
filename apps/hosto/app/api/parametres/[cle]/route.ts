import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/parametres/${cle}`);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/parametres/${cle}`);
}
