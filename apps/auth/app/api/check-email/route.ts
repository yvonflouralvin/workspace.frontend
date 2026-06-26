import { forwardToBackend } from "@repo/network/server";

const AUTH_API = process.env.AUTH_API_URL!;

export async function POST(request: Request) {
  return forwardToBackend(request, AUTH_API, "/auth/check-email");
}
