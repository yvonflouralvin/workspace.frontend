"use client";

import { useState } from "react";
import {
  ContentCopyOutlined,
  LinkOffOutlined,
  PublicOutlined,
} from "@mui/icons-material";
import { operationsApi, type Planning } from "@/lib/operations-api";

type Mode = "APPROBATION" | "AUTOMATIQUE";

const MODES: { cle: Mode; libelle: string; detail: string }[] = [
  {
    cle: "APPROBATION",
    libelle: "Avec validation",
    detail:
      "Chaque demande attend une décision. En attendant, elle n'occupe pas le créneau — sinon demander reviendrait à réserver.",
  },
  {
    cle: "AUTOMATIQUE",
    libelle: "Confirmation immédiate",
    detail:
      "La réservation est confirmée si le créneau est libre, refusée sinon. Un visiteur ne peut jamais passer outre un conflit.",
  },
];

/** Ouvrir un planning d'espaces à la réservation par lien.
 *
 *  Le jeton EST le droit d'accès : il n'y a rien d'autre à présenter pour
 *  réserver. C'est pourquoi régénérer coupe l'ancien lien sur-le-champ, et
 *  pourquoi l'écran le dit avant qu'on clique.
 */
export function PanneauLienReservation({
  planning,
  onChange,
}: {
  planning: Planning;
  onChange: () => void;
}) {
  const [mode, setMode] = useState<Mode>(planning.reservation_mode ?? "APPROBATION");
  const [enCours, setEnCours] = useState(false);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // L'adresse vient du backend : c'est le module Formulaire (app Workspace)
  // qui héberge la page, pas operations.
  const url = planning.reservation_url;

  async function agir(action: () => Promise<unknown>) {
    setEnCours(true);
    setErreur(null);
    try {
      await action();
      onChange();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Opération impossible.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-body-md font-medium text-on-surface">
            <PublicOutlined style={{ fontSize: 17 }} className="text-on-surface-variant" />
            Lien de réservation
          </h2>
          <p className="mt-0.5 max-w-[62ch] text-body-sm text-on-surface-variant">
            Génère un formulaire public dans le module Formulaire, que vous partagez par
            un lien. Chaque réponse revient ici en réservation. Les salles proposées sont
            celles de ce planning au moment où le lien est généré.
          </p>
        </div>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {MODES.map((m) => (
          <label
            key={m.cle}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${
              mode === m.cle
                ? "border-primary bg-surface-container-low"
                : "border-outline-soft hover:bg-surface-container-low"
            }`}
          >
            <input
              type="radio"
              name="mode-reservation"
              checked={mode === m.cle}
              onChange={() => setMode(m.cle)}
              className="mt-1"
            />
            <span>
              <span className="block text-body-sm text-on-surface">{m.libelle}</span>
              <span className="block text-label-md text-on-surface-variant">{m.detail}</span>
            </span>
          </label>
        ))}
      </div>

      {url ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface">
              {url}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(url);
                setCopie(true);
                setTimeout(() => setCopie(false), 2000);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
            >
              <ContentCopyOutlined style={{ fontSize: 15 }} />
              {copie ? "Copié" : "Copier"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={enCours}
              onClick={() => agir(() => operationsApi.ouvrirLienReservation(planning.id, mode))}
              className="text-label-md text-primary disabled:opacity-50"
            >
              {mode === planning.reservation_mode
                ? "Régénérer le lien"
                : "Appliquer ce mode et régénérer"}
            </button>
            <button
              type="button"
              disabled={enCours}
              onClick={() => agir(() => operationsApi.fermerLienReservation(planning.id))}
              className="inline-flex items-center gap-1 text-label-md text-error disabled:opacity-50"
            >
              <LinkOffOutlined style={{ fontSize: 14 }} />
              Révoquer
            </button>
          </div>
          <p className="mt-1 text-label-md text-outline">
            Régénérer ou révoquer coupe l&apos;ancien lien immédiatement : ceux qui l&apos;ont déjà
            ne pourront plus réserver.
          </p>
        </>
      ) : (
        <button
          type="button"
          disabled={enCours}
          onClick={() => agir(() => operationsApi.ouvrirLienReservation(planning.id, mode))}
          className="mt-3 h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
        >
          {enCours ? "…" : "Générer le lien"}
        </button>
      )}
    </section>
  );
}
