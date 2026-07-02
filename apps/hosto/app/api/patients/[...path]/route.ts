import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/patients/${path.join("/")}`);
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
