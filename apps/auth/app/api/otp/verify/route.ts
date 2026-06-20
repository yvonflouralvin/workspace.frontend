import { decryptRequestBody, encryptResponseBody, toBadRequestResponse } from "@repo/network/server";

const AUTH_API = process.env.AUTH_API_URL ?? process.env.NEXT_PUBLIC_AUTH_API!;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await decryptRequestBody(request);
  } catch (error) {
    return toBadRequestResponse(error);
  }

  const backendResponse = await fetch(`${AUTH_API}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await backendResponse.json();

  if (!backendResponse.ok) {
    return encryptResponseBody(data, { status: backendResponse.status });
  }

  const response = await encryptResponseBody({ user: { email: data.user.email } });

  response.cookies.set("access_token", data.user.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  response.cookies.set("refresh_token", data.user.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
