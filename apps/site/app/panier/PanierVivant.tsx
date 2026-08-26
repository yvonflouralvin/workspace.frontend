"use client";

import { useCallback, useEffect, useState } from "react";

import { appeler, type Panier } from "../lib/boutique-client";

/** Le panier, vivant.
 *
 *  Il se relit au serveur à chaque geste : le total, la disponibilité et le
 *  plafond de stock sont des décisions du serveur, et les recalculer ici
 *  reviendrait à écrire deux fois la même règle — puis à les voir diverger.
 */
export function PanierVivant({ initial }: { initial: Panier | null }) {
  const [panier, setPanier] = useState<Panier | null>(initial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const relire = useCallback(async () => {
    try {
      setPanier(await appeler<Panier>("panier.lire"));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Panier indisponible.");
    }
  }, []);

  useEffect(() => {
    if (!initial) void relire();
  }, [initial, relire]);

  async function changer(ligne_id: number, quantite: number) {
    setBusy(true);
    setErreur(null);
    try {
      setPanier(await appeler<Panier>("panier.changer", { ligne_id, quantite }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (!panier || panier.lignes.length === 0) {
    return (
      <p style={{ color: "var(--site-texte-doux)", marginTop: 24 }}>
        Votre panier est vide.{" "}
        <a href="/boutique" style={{ color: "var(--site-primaire)" }}>
          Voir la boutique
        </a>
      </p>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      {erreur && <p style={{ color: "#b00020" }}>{erreur}</p>}

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
        {panier.lignes.map((l) => (
          <li
            key={l.ligne_id}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              padding: 12,
              border: "1px solid rgba(0,0,0,.1)",
              borderRadius: "var(--site-rayon)",
              opacity: l.disponible ? 1 : 0.6,
            }}
          >
            {l.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/_media/${l.image}`}
                alt=""
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }}
              />
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <a
                href={`/boutique/${l.produit_slug}`}
                style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}
              >
                {l.produit_nom}
              </a>
              {l.variante_libelle && (
                <span style={{ display: "block", fontSize: 14, color: "var(--site-texte-doux)" }}>
                  {l.variante_libelle}
                </span>
              )}
              {!l.disponible && (
                <span style={{ display: "block", fontSize: 13, color: "#b00020" }}>
                  Cet article n&apos;est plus disponible — retirez-le pour commander.
                </span>
              )}
            </span>

            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void changer(l.ligne_id, l.quantite - 1)}
                style={bouton()}
                aria-label="Retirer un"
              >
                −
              </button>
              <span style={{ minWidth: 24, textAlign: "center" }}>{l.quantite}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void changer(l.ligne_id, l.quantite + 1)}
                style={bouton()}
                aria-label="Ajouter un"
              >
                +
              </button>
            </span>

            <span style={{ minWidth: 90, textAlign: "right", fontWeight: 600 }}>
              {formater(l.total_centimes, panier.devise)}
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={() => void changer(l.ligne_id, 0)}
              style={{ ...bouton(), border: "none", color: "var(--site-texte-doux)" }}
              aria-label={`Retirer ${l.produit_nom}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid rgba(0,0,0,.12)",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700 }}>
          Total : {formater(panier.total_centimes, panier.devise)}
        </span>
        <a
          href="/commande"
          style={{
            display: "inline-block",
            padding: "12px 26px",
            borderRadius: "var(--site-rayon)",
            background: "var(--site-primaire)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Commander
        </a>
      </div>
    </div>
  );
}

function bouton() {
  return {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,.15)",
    background: "transparent",
    cursor: "pointer",
    color: "inherit",
  } as const;
}

export function formater(centimes: number, devise: string): string {
  const signe = devise === "USD" ? "$" : devise === "EUR" ? "€" : devise;
  return `${(centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${signe}`;
}
