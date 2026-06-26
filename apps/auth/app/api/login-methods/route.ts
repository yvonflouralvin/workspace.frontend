import { forwardToBackend } from "@repo/network/server";

const AUTH_API = process.env.AUTH_API_URL!;

export async function GET(request: Request) {
  return forwardToBackend(request, AUTH_API, "/auth/login-methods");
}
