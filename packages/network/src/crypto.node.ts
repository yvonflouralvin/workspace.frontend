import { webcrypto } from "node:crypto";
import type { WebCrypto } from "./cipher.js";

export function getWebCrypto(): WebCrypto {
  return webcrypto as unknown as WebCrypto;
}
