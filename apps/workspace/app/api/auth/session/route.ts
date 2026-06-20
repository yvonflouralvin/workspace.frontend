import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const FLASK_URL = process.env.AUTH_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, FLASK_URL, "/auth/session");
}
