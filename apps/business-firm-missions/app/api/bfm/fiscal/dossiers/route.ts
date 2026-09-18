import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const BUSINESS_FIRM_MISSIONS_API_URL = process.env.BUSINESS_FIRM_MISSIONS_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, BUSINESS_FIRM_MISSIONS_API_URL, "/bfm/fiscal/dossiers");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, BUSINESS_FIRM_MISSIONS_API_URL, "/bfm/fiscal/dossiers");
}
