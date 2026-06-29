export function isServerEncrypted(): boolean {
  return process.env.NETWORK_ENCRYPTION !== "clear";
}

export function getServerKey(): string {
  const key = process.env.NETWORK_ENCRYPTION_KEY;
  if (!key) throw new Error("NETWORK_ENCRYPTION_KEY is not set");
  return key;
}

export function isClientEncrypted(): boolean {
  return process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION !== "clear";
}

export function getClientKey(): string {
  const key = process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY is not set");
  return key;
}
