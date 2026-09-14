"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listFacturesAComptabiliser,
  comptabiliserFacture,
  listJournaux,
  listExercices,
  listComptes,
  listTaxes,
  type FactureAComptabiliser,
  type Journal,
  type Exercice,
  type Compte,
  type Taxe,
} from "@/lib/compta-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ComptabiliserPage() {
  const { can } = usePermissions();
  const canSaisir = can("comptabilite.ecritures.saisir");

  const [factures, setFactures] = useState<FactureAComptabiliser[] | null>(null);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [taxes, setTaxes] = useState<Taxe[]>([]);
  const [ouverte, setOuverte] = useState<FactureAComptabiliser | null>(null);

  const [journalId, setJournalId] = useState("");
  const [exerciceId, setExerciceId] = useState("");
  const [compteClientId, setCompteClientId] = useState<number | null>(null);
  const [compteClientLabel, setCompteClientLabel] = useState("");
  const [compteVenteId, setCompteVenteId] = useState<number | null>(null);
  const [compteVenteLabel, setCompteVenteLabel] = useState("");
  const [taxeId, setTaxeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listFacturesAComptabiliser().then(setFactures);
  }

  useEffect(() => {
    reload();
    listJournaux().then(setJournaux);
    listTaxes().then(setTaxes);
    listExercices().then((list) => {
      setExercices(list);
      const ouvert = list.find((e) => e.statut === "OUVERT");
      if (ouvert) setExerciceId(String(ouvert.id));
    });
  }, []);

  function ouvrir(f: FactureAComptabiliser) {
    setOuverte(f);
    setError(null);
    const vente = journaux.find((j) => j.type_journal === "VENTES");
    if (vente) setJournalId(String(vente.id));
  }

  async function comptabiliser() {
    if (!ouverte) return;
    if (!journalId || !exerciceId || !compteClientId || !compteVenteId) {
      setError("Journal, exercice, compte client et compte de vente sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await comptabiliserFacture(ouverte.id, {
        journal_id: Number(journalId),
        exercice_id: Number(exerciceId),
        compte_client_id: compteClientId,
        compte_vente_id: compteVenteId,
        taxe_id: taxeId ? Number(taxeId) : null,
      });
      setOuverte(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Factures à comptabiliser</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Factures émises côté Ventes, ventilées en HT / TVA lors de la comptabilisation.
          </p>
        </div>

        {factures === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : factures.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">Aucune facture émise à comptabiliser.</p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            {factures.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium text-on-surface">{f.code} — {f.client_nom ?? "Client inconnu"}</p>
                  <p className="text-label-md text-outline">{f.date_facture ?? "—"} · {montant(f.montant_total)}</p>
                </div>
                {f.deja_comptabilisee ? (
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold bg-member-active-container text-member-active">
                    Déjà comptabilisée
                  </span>
                ) : (
                  canSaisir && (
                    <button
                      type="button"
                      onClick={() => ouvrir(f)}
                      className="h-8 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
                    >
                      Comptabiliser
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}

        {ouverte && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => setOuverte(null)}>
            <div
              className="w-full max-w-[560px] rounded-2xl bg-surface-container-lowest shadow-modal p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-headline-sm text-on-surface">
                Comptabiliser {ouverte.code}
              </h2>
              {error && <p className="text-body-sm text-error">{error}</p>}
              <div className="space-y-3">
                <div>
                  <span className="block text-label-sm uppercase text-outline mb-1">Journal</span>
                  <select value={journalId} onChange={(e) => setJournalId(e.target.value)} className={`${FIELD} w-full`}>
                    <option value="">—</option>
                    {journaux.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <span className="block text-label-sm uppercase text-outline mb-1">Exercice</span>
                  <select value={exerciceId} onChange={(e) => setExerciceId(e.target.value)} className={`${FIELD} w-full`}>
                    {exercices.filter((ex) => ex.statut === "OUVERT").map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.libelle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="block text-label-sm uppercase text-outline mb-1">Compte client (débit TTC)</span>
                  <SearchSelect<Compte>
                    fetchOptions={(q) => listComptes({ q })}
                    value={compteClientId}
                    onChange={(value, record) => {
                      setCompteClientId(value as number | null);
                      setCompteClientLabel(record ? `${record.numero} — ${record.libelle}` : "");
                    }}
                    getOptionLabel={(c) => `${c.numero} — ${c.libelle}`}
                    initialLabel={compteClientLabel}
                    placeholder="Ex. 411000 — Clients"
                  />
                </div>
                <div>
                  <span className="block text-label-sm uppercase text-outline mb-1">Compte de vente (crédit HT)</span>
                  <SearchSelect<Compte>
                    fetchOptions={(q) => listComptes({ q })}
                    value={compteVenteId}
                    onChange={(value, record) => {
                      setCompteVenteId(value as number | null);
                      setCompteVenteLabel(record ? `${record.numero} — ${record.libelle}` : "");
                    }}
                    getOptionLabel={(c) => `${c.numero} — ${c.libelle}`}
                    initialLabel={compteVenteLabel}
                    placeholder="Ex. 701000 — Ventes"
                  />
                </div>
                <div>
                  <span className="block text-label-sm uppercase text-outline mb-1">Taxe (optionnel)</span>
                  <select value={taxeId} onChange={(e) => setTaxeId(e.target.value)} className={`${FIELD} w-full`}>
                    <option value="">Aucune</option>
                    {taxes.map((t) => <option key={t.id} value={t.id}>{t.nom} ({t.taux}%)</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOuverte(null)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
                  Annuler
                </button>
                <button type="button" onClick={comptabiliser} disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
                  {saving ? "…" : "Comptabiliser"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
