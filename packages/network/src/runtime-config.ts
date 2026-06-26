let cache: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

export async function getPublicConfig(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (!pending) {
    pending = fetch("/api/public-config")
      .then((r) => {
        if (!r.ok) throw new Error(`[vault] public-config: ${r.status}`);
        return r.json();
      })
      .then((data: Record<string, string>) => {
        cache = data;
        return cache!;
      });
  }
  return pending;
}
