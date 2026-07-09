import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ paramId: string }> }) {
  const { paramId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/examens/parametres/${paramId}`);
}
