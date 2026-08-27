"use client";

import { useState, type CSSProperties } from "react";

import { texte } from "../theme";

export function AbonnementVue({
  props,
  contexte,
  style,
  attributs,
}: {
  props: Record<string, unknown>;
  contexte: { edition?: boolean };
  style?: CSSProperties;
  attributs?: Record<string, unknown>;
}) {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"repos" | "envoi" | "fait" | "erreur">("repos");
  const [message, setMessage] = useState<string | null>(null);

  const titre = texte(props.titre, "Restons en contact");
  const intro = texte(props.intro, "");
  const invite = texte(props.invite, "Votre adresse email");
  const bouton = texte(props.bouton, "Je m'abonne");
  const merci = texte(props.merci, "Merci — vous êtes inscrit.");
  const source = texte(props.source, "");

  async function envoyer() {
    if (contexte.edition) {
      setEtat("fait");
      return;
    }
    setEtat("envoi");
    setMessage(null);
    try {
      const reponse = await fetch("/api/boutique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "abonne.inscrire",
          donnees: { email, source: source || "bloc abonnement" },
        }),
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => ({}));
        throw new Error(
          typeof corps?.detail === "string" ? corps.detail : "Inscription impossible.",
        );
      }
      setEtat("fait");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Inscription impossible.");
      setEtat("erreur");
    }
  }

  return (
    <div {...attributs} style={style}>
      {titre && (
        <p style={{ fontFamily: "var(--site-police-titre)", fontSize: 22, fontWeight: 700, margin: 0 }}>
          {titre}
        </p>
      )}
      {intro && (
        <p style={{ marginTop: 6, color: "var(--site-texte-doux)" }}>{intro}</p>
      )}

      {etat === "fait" ? (
        <p style={{ marginTop: 12, fontWeight: 600 }}>{merci}</p>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input
            type="email"
            value={email}
            placeholder={invite}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: "1 1 200px",
              height: 44,
              padding: "0 14px",
              borderRadius: "var(--site-rayon)",
              border: "1px solid rgba(0,0,0,.2)",
              background: "#fff",
              color: "#111",
            }}
          />
          <button
            type="button"
            disabled={etat === "envoi" || !email.includes("@")}
            onClick={() => void envoyer()}
            style={{
              height: 44,
              padding: "0 22px",
              borderRadius: "var(--site-rayon)",
              border: "none",
              background: "var(--site-primaire)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              opacity: etat === "envoi" || !email.includes("@") ? 0.6 : 1,
            }}
          >
            {etat === "envoi" ? "…" : bouton}
          </button>
        </div>
      )}

      {message && <p style={{ marginTop: 8, color: "#b00020" }}>{message}</p>}
    </div>
  );
}
