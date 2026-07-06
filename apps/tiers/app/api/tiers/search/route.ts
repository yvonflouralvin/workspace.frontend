import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const TIERS_API_URL = process.env.TIERS_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, TIERS_API_URL, "/tiers/search");
}
