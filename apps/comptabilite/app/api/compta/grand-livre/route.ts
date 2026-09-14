import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const COMPTABILITE_API_URL = process.env.COMPTABILITE_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, COMPTABILITE_API_URL, "/compta/grand-livre");
}
