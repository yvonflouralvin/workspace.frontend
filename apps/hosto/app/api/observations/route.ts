import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

async function handler(request: NextRequest) {
  return forwardToBackend(request, HOSTO_API_URL, "/hosto/observations");
}

export const POST = handler;
