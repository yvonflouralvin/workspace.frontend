import { NextResponse } from "next/server.js";
import { decrypt, encrypt } from "./cipher.js";
import { getWebCrypto } from "./crypto.node.js";
import { getServerKey, isServerEncrypted } from "./config.js";
import { isEnvelope } from "./envelope.js";
import { NetworkDecryptionError, toBadRequestResponse } from "./errors.js";

export { NetworkDecryptionError, toBadRequestResponse } from "./errors.js";

// `Request`/`Response` (pas `NextRequest`/`NextResponse` en paramètre) pour rester
// compatible quelle que soit la version de `next` installée localement par chaque
// app du monorepo — `NextRequest` est une classe différente par version installée,
// `Request`/`Response` sont les interfaces globales WHATWG, stables partout.

export async function decryptRequestBody<T = unknown>(request: Request): Promise<T> {
  const payload = await request.json();

  if (!isServerEncrypted()) {
    return payload as T;
  }
  if (!isEnvelope(payload)) {
    throw new NetworkDecryptionError("Expected an encrypted envelope");
  }
  return decrypt<T>(getWebCrypto(), getServerKey(), payload);
}

export async function encryptResponseBody(data: unknown, init?: { status?: number }): Promise<NextResponse> {
  if (!isServerEncrypted()) {
    return NextResponse.json(data, init);
  }
  const envelope = await encrypt(getWebCrypto(), getServerKey(), data);
  return NextResponse.json(envelope, init);
}

export async function forwardToBackend(
  request: Request,
  backendUrl: string,
  path: string
): Promise<Response> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const init: RequestInit = {
    method: request.method,
    headers: { cookie: cookieHeader },
  };

  if (request.method !== "GET" && request.method !== "DELETE") {
    let body: unknown;
    try {
      body = await decryptRequestBody(request);
    } catch (error) {
      return toBadRequestResponse(error);
    }
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${backendUrl}${path}`, init);
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return new NextResponse(await res.text(), { status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return encryptResponseBody(data, { status: res.status });
}
