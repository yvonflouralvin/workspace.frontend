import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUDIT_LOGS_API_URL = process.env.AUDIT_LOGS_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, AUDIT_LOGS_API_URL, "/audit-logs");
}
