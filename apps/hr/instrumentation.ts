export async function register() {
  const url = process.env.VAULT_URL;
  const service = process.env.VAULT_SERVICE;
  const token = process.env.VAULT_TOKEN;

  if (!url || !service || !token) return;

  try {
    const res = await fetch(`${url}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, token }),
    });

    if (!res.ok) throw new Error(`[vault] fetch failed: ${res.status}`);

    const config: Record<string, string> = await res.json();
    for (const [key, value] of Object.entries(config)) {
      process.env[key] = value;
    }
  } catch (err) {
    console.error("[vault] FATAL: cannot reach vault —", err);
    process.exit(1);
  }
}
