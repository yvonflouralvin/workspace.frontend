import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";
const HOSTO_API_URL = process.env.HOSTO_API_URL!;
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/medications/${itemId}`);
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/medications/${itemId}`);
}
