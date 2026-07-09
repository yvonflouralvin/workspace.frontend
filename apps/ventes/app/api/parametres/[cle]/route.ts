import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const VENTES_API_URL = process.env.VENTES_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/parametres/${cle}`);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/parametres/${cle}`);
}
