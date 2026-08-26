"use client";

import { useState } from "react";

import { appeler, type Panier } from "../../lib/boutique-client";

/** Le choix d'une déclinaison, et l'ajout au panier.
 *
 *  Le prix affiché suit la déclinaison choisie : montrer « à partir de » après
 *  le choix ferait douter du montant qu'on s'apprête à payer.
 */
export function AjoutPanier({
  variantes,
  devise,
}: {
  variantes: { id: number; libelle: string | null; prix_centimes: number; disponible: boolean }[];
  devise: string;
}) {
  const achetables = variantes.filter((v) => v.disponible);
  const [choisie, setChoisie] = useState<number | null>(achetables[0]?.id ?? null);
  const [quantite, setQuantite] = useState(1);
  const [etat, setEtat] = useState<"repos" | "envoi" | "ajoute">("repos");
  const [erreur, setErreur] = useState<string | null>(null);

  if (achetables.length === 0) {
    return (
      <p style={{ marginTop: 20, color: "var(--site-texte-doux)" }}>
        Momentanément indisponible.
      </p>
    );
  }

  const variante = variantes.find((v) => v.id === choisie) ?? achetables[0]!;

  async function ajouter() {
    setEtat("envoi");
    setErreur(null);
    try {
      await appeler<Panier>("panier.ajouter", { variante_id: variante.id, quantite });
      setEtat("ajoute");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ajout impossible.");
      setEtat("repos");
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      {variantes.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {variantes.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={!v.disponible}
              onClick={() => setChoisie(v.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--site-rayon)",
                border:
                  v.id === choisie
                    ? "2px solid var(--site-primaire)"
                    : "1px solid rgba(0,0,0,.18)",
                background: "transparent",
                color: "inherit",
                cursor: v.disponible ? "pointer" : "not-allowed",
                opacity: v.disponible ? 1 : 0.45,
              }}
            >
              {v.libelle ?? "Standard"}
              {!v.disponible ? " · épuisé" : ""}
            </button>
          ))}
        </div>
      )}

      <p style={{ fontSize: 26, fontWeight: 700, margin: "0 0 14px" }}>
        {(variante.prix_centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
        {devise === "USD" ? "$" : devise === "EUR" ? "€" : devise}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="number"
          min={1}
          max={99}
          value={quantite}
          onChange={(e) => setQuantite(Math.max(1, Number(e.target.value) || 1))}
          aria-label="Quantité"
          style={{
            width: 72,
            height: 46,
            padding: "0 10px",
            borderRadius: "var(--site-rayon)",
            border: "1px solid rgba(0,0,0,.2)",
            background: "transparent",
            color: "inherit",
          }}
        />
        <button
          type="button"
          disabled={etat === "envoi"}
          onClick={() => void ajouter()}
          style={{
            padding: "13px 28px",
            borderRadius: "var(--site-rayon)",
            background: "var(--site-primaire)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            opacity: etat === "envoi" ? 0.6 : 1,
          }}
        >
          {etat === "envoi" ? "Ajout…" : "Ajouter au panier"}
        </button>
        {etat === "ajoute" && (
          <a href="/panier" style={{ color: "var(--site-primaire)", fontWeight: 600 }}>
            Voir le panier →
          </a>
        )}
      </div>

      {erreur && <p style={{ color: "#b00020", marginTop: 10 }}>{erreur}</p>}
    </div>
  );
}
