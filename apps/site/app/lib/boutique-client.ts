"use client";

/** Le petit client de la boutique, côté navigateur.
 *
 *  Une seule porte (`/api/boutique`) et une action nommée : les cookies sont
 *  posés par le serveur, jamais par ce code — un jeton que du script peut lire
 *  est un jeton que la première injection venue emporte.
 */
export async function appeler<T>(
  action: string,
  donnees: Record<string, unknown> = {},
): Promise<T> {
  const reponse = await fetch("/api/boutique", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, donnees }),
  });
  const charge = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(
      typeof charge?.detail === "string" ? charge.detail : "L'opération a échoué.",
    );
  }
  return charge as T;
}

export interface LignePanier {
  ligne_id: number;
  variante_id: number;
  produit_nom: string;
  produit_slug: string;
  variante_libelle: string | null;
  image: string | null;
  prix_unitaire_centimes: number;
  quantite: number;
  total_centimes: number;
  disponible: boolean;
}

export interface Panier {
  jeton: string;
  lignes: LignePanier[];
  total_centimes: number;
  devise: string;
  articles: number;
  client: { email: string; nom: string | null } | null;
}
