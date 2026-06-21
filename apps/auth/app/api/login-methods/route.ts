import { forwardToBackend } from "@repo/network/server";

const AUTH_API = process.env.AUTH_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API!;

export async function GET(request: Request) {
  return forwardToBackend(request, AUTH_API, "/auth/login-methods");
}
