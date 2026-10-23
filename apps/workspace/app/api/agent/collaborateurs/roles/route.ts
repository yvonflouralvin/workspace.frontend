import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AGENT_API_URL = process.env.AGENT_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, AGENT_API_URL, "/agent/collaborateurs/roles");
}
