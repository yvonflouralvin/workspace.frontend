import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/acte-catalog/${id}`);
}

export const GET = handler;
export const PUT = handler;
export const DELETE = handler;
