import { NextResponse } from "next/server.js";
import { decrypt, encrypt } from "./cipher.js";
import { getWebCrypto } from "./crypto.node.js";
import { getServerKey, isServerEncrypted } from "./config.js";
import { isEnvelope } from "./envelope.js";
import { NetworkDecryptionError, toBadRequestResponse } from "./errors.js";

export { NetworkDecryptionError, toBadRequestResponse } from "./errors.js";

// Statuts « null body » (WHATWG) : une Response avec un corps sur l'un d'eux lève
// « Response with null body status cannot have body » (ex. 204 d'un DELETE backend).
const NULL_BODY_STATUS = new Set([101, 103, 204, 205, 304]);

// `Request`/`Response` (pas `NextRequest`/`NextResponse` en paramètre) pour rester
// compatible quelle que soit la version de `next` installée localement par chaque
// app du monorepo — `NextRequest` est une classe différente par version installée,
// `Request`/`Response` sont les interfaces globales WHATWG, stables partout.

export async function decryptRequestBody<T = unknown>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) {
    return undefined as T;
  }
  const payload = JSON.parse(text);

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

interface SearchDomainEntry {
  domain_key: string;
  label: string;
  app_name: string;
  search_url: string;
  required_permission: string | null;
}

interface SearchResult {
  id: number | string;
  title: string;
  subtitle: string | null;
  url: string;
}

export interface SearchSection {
  domain_key: string;
  label: string;
  app_name: string;
  results: SearchResult[];
}

export async function globalSearchHandler(
  q: string,
  cookieHeader: string,
  authApiUrl: string
): Promise<NextResponse> {
  if (q.length < 2) return encryptResponseBody([]);

  const domainsRes = await fetch(`${authApiUrl}/auth/apps/search-domains`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!domainsRes.ok) return encryptResponseBody([]);

  const domains: SearchDomainEntry[] = await domainsRes.json();
  if (domains.length === 0) return encryptResponseBody([]);

  const sections = await Promise.all(
    domains.map(async (domain): Promise<SearchSection | null> => {
      try {
        const url = new URL(domain.search_url);
        url.searchParams.set("q", q);
        url.searchParams.set("limit", "3");

        const res = await fetch(url.toString(), {
          headers: { cookie: cookieHeader },
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        });

        if (!res.ok) return null;

        const results: SearchResult[] = await res.json();
        if (results.length === 0) return null;

        return { domain_key: domain.domain_key, label: domain.label, app_name: domain.app_name, results };
      } catch {
        return null;
      }
    })
  );

  return encryptResponseBody(sections.filter((s): s is SearchSection => s !== null));
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

  const search = new URL(request.url).search;
  const res = await fetch(`${backendUrl}${path}${search}`, init);

  // 204/304/… : pas de corps autorisé — le relayer tel quel (sinon TypeError).
  if (NULL_BODY_STATUS.has(res.status)) {
    return relayerCookies(res, new NextResponse(null, { status: res.status }));
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return relayerCookies(res, new NextResponse(await res.text(), { status: res.status }));
  }

  const data = await res.json().catch(() => ({}));
  return relayerCookies(res, await encryptResponseBody(data, { status: res.status }));
}

/** Rendre au navigateur les cookies que le backend a posés.
 *
 *  Le relais les avalait : un `Set-Cookie` émis par le service ne franchissait
 *  pas le BFF. C'est ce qui empêchait la session de se prolonger — `auth`
 *  réémettait bien le jeton, personne ne le recevait. Les routes qui posaient
 *  un cookie devaient donc le faire elles-mêmes, une par une.
 *
 *  `getSetCookie()` et non `get("set-cookie")` : plusieurs cookies arrivent
 *  dans plusieurs en-têtes, et les concaténer en un seul les corromprait — les
 *  dates d'expiration contiennent des virgules.
 */
function relayerCookies(amont: Response, reponse: NextResponse): NextResponse {
  for (const cookie of amont.headers.getSetCookie?.() ?? []) {
    reponse.headers.append("set-cookie", cookie);
  }
  return reponse;
}
