import { decryptRequestBody, encryptResponseBody, toBadRequestResponse } from "@repo/network/server";
import { ACCESS_TOKEN_COOKIE, AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_COOKIE } from "@/app/lib/cookies";

const AUTH_API = process.env.AUTH_API_URL!;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await decryptRequestBody(request);
  } catch (error) {
    return toBadRequestResponse(error);
  }

  const backendResponse = await fetch(`${AUTH_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    return encryptResponseBody(data, { status: backendResponse.status });
  }

  const response = await encryptResponseBody({ user: { email: data.user.email } });

  response.cookies.set(ACCESS_TOKEN_COOKIE, data.user.access_token, AUTH_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_TOKEN_COOKIE, data.user.refresh_token, AUTH_COOKIE_OPTIONS);

  return response;
}
