import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ rangeId: string }> }) {
  const { rangeId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/examens/valeurs/${rangeId}`);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ rangeId: string }> }) {
  const { rangeId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/examens/valeurs/${rangeId}`);
}
