import { getPublicConfig } from "./runtime-config.js";

export function isServerEncrypted(): boolean {
  return process.env.NETWORK_ENCRYPTION !== "clear";
}

export function getServerKey(): string {
  const key = process.env.NETWORK_ENCRYPTION_KEY;
  if (!key) throw new Error("NETWORK_ENCRYPTION_KEY is not set");
  return key;
}

export async function isClientEncrypted(): Promise<boolean> {
  const config = await getPublicConfig();
  return config.networkEncryption !== "clear";
}

export async function getClientKey(): Promise<string> {
  const config = await getPublicConfig();
  return config.networkEncryptionKey ?? "";
}
