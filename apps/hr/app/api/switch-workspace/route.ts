import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUTH_API_URL = process.env.AUTH_API_URL!;

export async function POST(request: NextRequest) {
  return forwardToBackend(request, AUTH_API_URL, "/auth/switch-workspace");
}
