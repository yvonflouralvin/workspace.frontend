"use client";

import { useEffect, useState } from "react";

import { appeler, type Panier } from "../lib/boutique-client";
import { formater } from "../panier/PanierVivant";

interface Commande {
  reference: string;
  statut_libelle: string;
  total_centimes: number;
  devise: string;
  email: string;
  lignes: { produit_nom: string; variante_libelle: string | null; quantite: number; total_centimes: number }[];
}

/** Le paiement n'est pas branché : la commande est ENREGISTRÉE, pas payée.
 *
 *  On le dit en toutes lettres plutôt que d'afficher un bouton « Payer » qui
 *  n'encaisse rien — un acheteur qui croit avoir payé et ne reçoit rien est
 *  bien plus coûteux qu'un acheteur qu'on rappelle. Le branchement d'un
 *  encaissement est un lot à part.
 */
export function FormulaireCommande() {
  const [panier, setPanier] = useState<Panier | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [commande, setCommande] = useState<Commande | null>(null);

  useEffect(() => {
    void appeler<Panier>("panier.lire")
      .then((p) => {
        setPanier(p);
        if (p.client) {
          setValeurs((v) => ({
            ...v,
            email: p.client!.email,
            nom: p.client!.nom ?? "",
          }));
        }
      })
      .catch(() => setPanier(null));
  }, []);

  async function envoyer() {
    setBusy(true);
    setErreur(null);
    try {
      setCommande(await appeler<Commande>("commande.passer", valeurs));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La commande n'a pas pu être enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  if (commande) {
    return (
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 20, fontWeight: 700 }}>Votre commande est enregistrée.</p>
        <p style={{ marginTop: 8 }}>
          Référence :{" "}
          <strong style={{ fontFamily: "monospace", fontSize: 18 }}>{commande.reference}</strong>
        </p>
        <p style={{ color: "var(--site-texte-doux)", marginTop: 4 }}>
          Conservez-la : avec votre adresse email, elle suffit à suivre votre commande.
        </p>
        <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
          {commande.lignes.map((l, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>
                {l.produit_nom}
                {l.variante_libelle ? ` — ${l.variante_libelle}` : ""} × {l.quantite}
              </span>
              <span>{formater(l.total_centimes, commande.devise)}</span>
            </li>
          ))}
        </ul>
        <p style={{ fontWeight: 700, fontSize: 18, marginTop: 10 }}>
          Total : {formater(commande.total_centimes, commande.devise)}
        </p>
        <p style={{ marginTop: 20, fontSize: 14, color: "var(--site-texte-doux)" }}>
          {commande.statut_libelle}. Le paiement n&apos;est pas encore encaissé en ligne : la
          boutique vous recontactera pour le règlement et la livraison.
        </p>
      </div>
    );
  }

  if (!panier || panier.lignes.length === 0) {
    return (
      <p style={{ marginTop: 24, color: "var(--site-texte-doux)" }}>
        Votre panier est vide.{" "}
        <a href="/boutique" style={{ color: "var(--site-primaire)" }}>
          Voir la boutique
        </a>
      </p>
    );
  }

  const champs = [
    { cle: "nom", libelle: "Nom complet", requis: true },
    { cle: "email", libelle: "Email", requis: true, type: "email" },
    { cle: "telephone", libelle: "Téléphone", type: "tel" },
    { cle: "adresse_livraison", libelle: "Adresse de livraison" },
    { cle: "note", libelle: "Précisions (facultatif)" },
  ];

  return (
    <div style={{ marginTop: 24, display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      <div>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Vos coordonnées</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {champs.map((c) => (
            <label key={c.cle} style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
                {c.libelle}
                {c.requis ? " *" : ""}
              </span>
              <input
                type={c.type ?? "text"}
                value={valeurs[c.cle] ?? ""}
                onChange={(e) => setValeurs((v) => ({ ...v, [c.cle]: e.target.value }))}
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 12px",
                  borderRadius: "var(--site-rayon)",
                  border: "1px solid rgba(0,0,0,.2)",
                  background: "transparent",
                  color: "inherit",
                }}
              />
            </label>
          ))}
        </div>

        {erreur && <p style={{ color: "#b00020", marginTop: 12 }}>{erreur}</p>}

        <button
          type="button"
          disabled={busy || !valeurs.nom?.trim() || !valeurs.email?.trim()}
          onClick={() => void envoyer()}
          style={{
            marginTop: 18,
            padding: "12px 26px",
            borderRadius: "var(--site-rayon)",
            background: "var(--site-primaire)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Envoi…" : "Enregistrer ma commande"}
        </button>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--site-texte-doux)" }}>
          Aucun paiement n&apos;est demandé ici : la boutique vous recontacte pour le règlement.
        </p>
      </div>

      <div>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Votre commande</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {panier.lignes.map((l) => (
            <li
              key={l.ligne_id}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0" }}
            >
              <span>
                {l.produit_nom}
                {l.variante_libelle ? ` — ${l.variante_libelle}` : ""} × {l.quantite}
              </span>
              <span>{formater(l.total_centimes, panier.devise)}</span>
            </li>
          ))}
        </ul>
        <p
          style={{
            fontWeight: 700,
            fontSize: 18,
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid rgba(0,0,0,.12)",
          }}
        >
          Total : {formater(panier.total_centimes, panier.devise)}
        </p>
      </div>
    </div>
  );
}
