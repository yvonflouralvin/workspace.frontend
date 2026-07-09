import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const VENTES_API_URL = process.env.VENTES_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/commandes/${id}`);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, VENTES_API_URL, `/commandes/${id}`);
}
