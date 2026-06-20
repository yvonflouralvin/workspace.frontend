import type { WebCrypto } from "./cipher.js";

export function getWebCrypto(): WebCrypto {
  return globalThis.crypto;
}
