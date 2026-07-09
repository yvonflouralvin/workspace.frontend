import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const VENTES_API_URL = process.env.VENTES_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, VENTES_API_URL, "/categories");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, VENTES_API_URL, "/categories");
}
