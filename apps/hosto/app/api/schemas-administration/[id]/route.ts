import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";
const HOSTO_API_URL = process.env.HOSTO_API_URL!;
async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/schemas-administration/${id}`);
}
export const PATCH = handler;
export const DELETE = handler;
