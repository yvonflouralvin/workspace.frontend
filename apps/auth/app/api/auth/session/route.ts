import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUTH_API = process.env.AUTH_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, AUTH_API, "/auth/session");
}
