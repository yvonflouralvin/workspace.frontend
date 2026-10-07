import { NextRequest } from "next/server";
import { encryptResponseBody } from "@repo/network/server";

const FLASK_URL = process.env.AUTH_API_URL!;

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  await fetch(`${FLASK_URL}/auth/logout`, {
    method: "POST",
    headers: { cookie: cookieHeader },
  });

  const response = await encryptResponseBody({ ok: true });
  // Sous leur nom par défaut, ces deux delete emporteraient le cookie de
  // l'autre instance du même domaine (voir apps/auth/app/lib/cookies.ts).
  response.cookies.delete(process.env.ACCESS_TOKEN_COOKIE_NAME ?? "access_token");
  response.cookies.delete(process.env.REFRESH_TOKEN_COOKIE_NAME ?? "refresh_token");
  return response;
}
