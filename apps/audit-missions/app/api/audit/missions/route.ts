import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUDIT_MISSIONS_API_URL = process.env.AUDIT_MISSIONS_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, AUDIT_MISSIONS_API_URL, "/audit/missions");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, AUDIT_MISSIONS_API_URL, "/audit/missions");
}
