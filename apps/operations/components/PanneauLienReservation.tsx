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
  // Ce qui est ENREGISTRÉ, pas ce qu'on proposerait. Afficher « 48 » sur un
  // lien qui n'a aucune politique laisse croire que la règle s'applique — et
  // c'est exactement ce qui s'est produit : des réservations passaient au-delà
  // de l'horizon affiché. Les défauts ne servent qu'au premier réglage.
  const dejaOuvert = planning.reservation_url !== null;
  const [preavis, setPreavis] = useState(
    planning.reservation_preavis_heures !== null
      ? String(planning.reservation_preavis_heures)
      : dejaOuvert ? "" : "48",
  );
  const [horizon, setHorizon] = useState(
    planning.reservation_horizon_heures !== null
      ? String(planning.reservation_horizon_heures)
      : dejaOuvert ? "" : String(24 * 7),
  );

  const delais = {
    preavis_heures: preavis.trim() ? Number(preavis) : null,
    horizon_heures: horizon.trim() ? Number(horizon) : null,
  };
  const delaisModifies =
    delais.preavis_heures !== planning.reservation_preavis_heures ||
    delais.horizon_heures !== planning.reservation_horizon_heures;
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

      <div className="mt-3 rounded-xl border border-outline-soft p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChampDelai
            titre="Pas moins de"
            suffixe="avant le créneau"
            valeur={preavis}
            onChange={setPreavis}
          />
          <ChampDelai
            titre="Pas plus de"
            suffixe="avant le créneau"
            valeur={horizon}
            onChange={setHorizon}
          />
        </div>
        <p className="mt-2 text-label-md text-outline">
          Laissé vide, le délai correspondant ne s&apos;applique pas. Les deux bornes se
          mesurent au moment où quelqu&apos;un remplit le formulaire, pas à la création du lien.
        </p>
        {url && (
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={enCours || !delaisModifies}
              onClick={() => agir(() => operationsApi.reglerLienReservation(planning.id, delais))}
              className="h-8 rounded-lg border border-outline-soft px-3 text-label-md font-medium text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
            >
              Enregistrer les délais
            </button>
            <span className="text-label-md text-outline">
              Sans régénérer le lien — l&apos;adresse déjà partagée continue de marcher.
            </span>
          </div>
        )}
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
              onClick={() => agir(() => operationsApi.ouvrirLienReservation(planning.id, mode, delais))}
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
          onClick={() => agir(() => operationsApi.ouvrirLienReservation(planning.id, mode, delais))}
          className="mt-3 h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
        >
          {enCours ? "…" : "Générer le lien"}
        </button>
      )}
    </section>
  );
}

/** Un délai en heures, avec son équivalent en jours dans le titre.
 *
 *  Une seule unité stockée — les heures se comparent et se règlent finement —
 *  et le jour affiché comme aide de lecture : « 168 h » ne se lit pas, « 7
 *  jours » si. */
function ChampDelai({
  titre,
  suffixe,
  valeur,
  onChange,
}: {
  titre: string;
  suffixe: string;
  valeur: string;
  onChange: (v: string) => void;
}) {
  const heures = Number(valeur);
  const enJours =
    valeur.trim() && Number.isFinite(heures) && heures >= 24
      ? `${Math.round((heures / 24) * 10) / 10} jour${heures >= 48 ? "s" : ""}`
      : null;

  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-md text-on-surface-variant">
        {titre}{" "}
        <span className="text-on-surface">{valeur.trim() ? `${valeur} h` : "—"}</span>
        {enJours && <span className="text-outline"> ({enJours})</span>} {suffixe}
      </span>
      <input
        type="number"
        min={0}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Aucune limite"
        className="h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
      />
    </label>
  );
}
