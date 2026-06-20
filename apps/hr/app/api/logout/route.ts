import { NextRequest } from "next/server";
import { encryptResponseBody } from "@repo/network/server";

const AUTH_API_URL = process.env.AUTH_API_URL!;

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  await fetch(`${AUTH_API_URL}/auth/logout`, {
    method: "POST",
    headers: { cookie: cookieHeader },
  });

  const response = await encryptResponseBody({ ok: true });
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}
