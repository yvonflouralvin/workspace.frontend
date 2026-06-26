import { base64ToBytes, bytesToBase64, type Envelope } from "./envelope.js";

const ALGORITHM = "AES-GCM";
const IV_LENGTH_BYTES = 12;

export type WebCrypto = Pick<Crypto, "subtle" | "getRandomValues">;

export class NetworkDecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkDecryptionError";
  }
}

async function importKey(crypto: WebCrypto, base64Key: string): Promise<CryptoKey> {
  const rawKey = base64ToBytes(base64Key);
  if (![16, 24, 32].includes(rawKey.byteLength)) {
    throw new Error(
      `Invalid NETWORK_ENCRYPTION_KEY: decoded to ${rawKey.byteLength} bytes, AES-GCM requires 16, 24 or 32. Generate with: openssl rand -base64 32`
    );
  }
  return crypto.subtle.importKey("raw", rawKey, ALGORITHM, false, ["encrypt", "decrypt"]);
}

export async function encrypt(
  crypto: WebCrypto,
  base64Key: string,
  payload: unknown
): Promise<Envelope> {
  const key = await importKey(crypto, base64Key);
  const iv: Uint8Array<ArrayBuffer> = new Uint8Array(IV_LENGTH_BYTES);
  crypto.getRandomValues(iv);

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext);

  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decrypt<T = unknown>(
  crypto: WebCrypto,
  base64Key: string,
  envelope: Envelope
): Promise<T> {
  try {
    const key = await importKey(crypto, base64Key);
    const iv = base64ToBytes(envelope.iv);
    const ciphertext = base64ToBytes(envelope.data);
    const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new NetworkDecryptionError("Failed to decrypt payload");
  }
}
