/** Lit une réponse JSON, ou lève l'erreur que le serveur a formulée.
 *
 *  Le backend répond `{detail: "..."}` : c'est ce texte-là qu'on veut montrer, pas « Erreur 422 ». */
export async function lire<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const corps = await res.json().catch(() => ({}));
    const detail = typeof corps?.detail === "string" ? corps.detail : null;
    throw new Error(detail ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
