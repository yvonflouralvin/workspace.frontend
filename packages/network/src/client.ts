import { decrypt, encrypt } from "./cipher.js";
import { getWebCrypto } from "./crypto.browser.js";
import { getClientKey, isClientEncrypted } from "./config.js";
import { isEnvelope } from "./envelope.js";

export type ApiFetchInit = Omit<RequestInit, "body"> & { body?: unknown };

// Statuts « null body » (WHATWG) : construire une Response avec un corps sur l'un
// d'eux lève « Response with null body status cannot have body ». Typiquement 204
// (No Content) renvoyé par un DELETE. On doit renvoyer un corps nul pour ceux-là.
const NULL_BODY_STATUS = new Set([101, 103, 204, 205, 304]);

/** Ce qu'on fait quand le serveur répond « vous n'êtes plus connecté ».
 *
 *  Un simple 401 laissait l'écran tel quel : les listes restaient affichées,
 *  les boutons ne faisaient plus rien, et l'utilisateur croyait à une panne
 *  plutôt qu'à une session expirée.
 *
 *  Le réseau ne DÉCIDE pas de la politique — il ne connaît ni l'écran de
 *  connexion ni la notion de session. Il se contente de prévenir qui s'est
 *  déclaré. `@repo/auth` s'inscrit au montage de `SessionProvider` ; l'écran de
 *  connexion, qui ne le monte pas, garde donc ses 401 « mot de passe
 *  incorrect » sans être renvoyé sur lui-même en boucle. */
type Ecouteur = () => void;

let ecouteurSessionExpiree: Ecouteur | null = null;

export function surSessionExpiree(ecouteur: Ecouteur | null): void {
  ecouteurSessionExpiree = ecouteur;
}

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

  if (response.status === 401) ecouteurSessionExpiree?.();

  if (NULL_BODY_STATUS.has(response.status)) {
    return new Response(null, { status: response.status });
  }

  const payload = await response.json().catch(() => null);

  const resolved =
    encrypted && isEnvelope(payload)
      ? await decrypt(getWebCrypto(), getClientKey(), payload)
      : payload;

  return new Response(JSON.stringify(resolved), { status: response.status });
}
