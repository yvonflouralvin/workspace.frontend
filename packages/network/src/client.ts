import { decrypt, encrypt } from "./cipher.js";
import { getWebCrypto } from "./crypto.browser.js";
import { getClientKey, isClientEncrypted } from "./config.js";
import { isEnvelope } from "./envelope.js";

export type ApiFetchInit = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const encrypted = isClientEncrypted();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  let body: string | undefined;
  if (init.body !== undefined) {
    body = encrypted
      ? JSON.stringify(await encrypt(getWebCrypto(), getClientKey(), init.body))
      : JSON.stringify(init.body);
  }

  const response = await fetch(path, { ...init, headers, body });
  const payload = await response.json().catch(() => null);

  const resolved =
    encrypted && isEnvelope(payload)
      ? await decrypt(getWebCrypto(), getClientKey(), payload)
      : payload;

  return new Response(JSON.stringify(resolved), { status: response.status });
}
