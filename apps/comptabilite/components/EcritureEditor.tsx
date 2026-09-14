"use client";

import { useMemo, useState } from "react";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  listComptes,
  createEcriture,
  updateEcriture,
  type Compte,
  type Journal,
  type Exercice,
  type Ecriture,
  type LigneEcritureInput,
} from "@/lib/compta-api";
import { AddOutlined, DeleteOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

interface LigneEdit {
  key: number;
  compteId: number | null;
  compteLabel: string;
  tiersId: string;
  libelle: string;
  debit: string;
  credit: string;
}

function ligneVide(key: number): LigneEdit {
  return { key, compteId: null, compteLabel: "", tiersId: "", libelle: "", debit: "", credit: "" };
}

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface EcritureEditorProps {
  journaux: Journal[];
  exercices: Exercice[];
  ecriture?: Ecriture;
  onSaved: (ec: Ecriture) => void;
  onCancel?: () => void;
}

export function EcritureEditor({ journaux, exercices, ecriture, onSaved, onCancel }: EcritureEditorProps) {
  const ouvert = exercices.find((e) => e.statut === "OUVERT");
  const [journalId, setJournalId] = useState(ecriture ? String(ecriture.journal_id) : journaux[0] ? String(journaux[0].id) : "");
  const [exerciceId, setExerciceId] = useState(ecriture ? String(ecriture.exercice_id) : ouvert ? String(ouvert.id) : "");
  const [dateEcriture, setDateEcriture] = useState(ecriture?.date_ecriture ?? new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState(ecriture?.libelle ?? "");
  const [reference, setReference] = useState(ecriture?.reference ?? "");
  const [lignes, setLignes] = useState<LigneEdit[]>(() => {
    if (ecriture) {
      return ecriture.lignes.map((l, i) => ({
        key: i,
        compteId: l.compte_id,
        compteLabel: l.compte_numero ? `${l.compte_numero} — ${l.compte_libelle}` : "",
        tiersId: l.tiers_id != null ? String(l.tiers_id) : "",
        libelle: l.libelle ?? "",
        debit: l.debit ? String(l.debit) : "",
        credit: l.credit ? String(l.credit) : "",
      }));
    }
    return [ligneVide(0), ligneVide(1)];
  });
  const [nextKey, setNextKey] = useState(lignes.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebit = useMemo(() => lignes.reduce((s, l) => s + (Number(l.debit) || 0), 0), [lignes]);
  const totalCredit = useMemo(() => lignes.reduce((s, l) => s + (Number(l.credit) || 0), 0), [lignes]);
  const equilibree = totalDebit === totalCredit && totalDebit > 0;

  function ajouterLigne() {
    setLignes((prev) => [...prev, ligneVide(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function retirerLigne(key: number) {
    setLignes((prev) => (prev.length > 2 ? prev.filter((l) => l.key !== key) : prev));
  }

  function patchLigne(key: number, patch: Partial<LigneEdit>) {
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function enregistrer() {
    setError(null);
    if (!journalId || !exerciceId || !libelle.trim()) {
      setError("Journal, exercice et libellé sont obligatoires.");
      return;
    }
    if (!equilibree) {
      setError("L'écriture doit être équilibrée (débit = crédit, total > 0) pour être enregistrée.");
      return;
    }
    const lignesInput: LigneEcritureInput[] = [];
    for (const l of lignes) {
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (!l.compteId || (debit === 0 && credit === 0)) continue;
      lignesInput.push({
        compte_id: l.compteId,
        tiers_id: l.tiersId ? Number(l.tiersId) : null,
        libelle: l.libelle.trim() || null,
        debit,
        credit,
      });
    }
    if (lignesInput.length < 2) {
      setError("Au moins deux lignes valides (compte + montant) sont nécessaires.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        journal_id: Number(journalId),
        exercice_id: Number(exerciceId),
        date_ecriture: dateEcriture,
        libelle: libelle.trim(),
        reference: reference.trim() || null,
        lignes: lignesInput,
      };
      const saved = ecriture ? await updateEcriture(ecriture.id, input) : await createEcriture(input);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-error-container bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1">Journal</span>
          <select value={journalId} onChange={(e) => setJournalId(e.target.value)} className={FIELD}>
            {journaux.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
          </select>
        </div>
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1">Exercice</span>
          <select value={exerciceId} onChange={(e) => setExerciceId(e.target.value)} className={FIELD}>
            {exercices.filter((ex) => ex.statut === "OUVERT").map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.libelle}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1">Date</span>
          <input type="date" value={dateEcriture} onChange={(e) => setDateEcriture(e.target.value)} className={FIELD} />
        </div>
        <div className="flex-1 min-w-[220px]">
          <span className="block text-label-sm uppercase text-outline mb-1">Libellé</span>
          <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={`${FIELD} w-full`} placeholder="Objet de l'écriture" />
        </div>
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1">Référence</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={FIELD} placeholder="Optionnel" />
        </div>
      </div>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                <th className="text-left px-3 py-2 min-w-[260px]">Compte</th>
                <th className="text-left px-3 py-2 min-w-[160px]">Libellé de ligne</th>
                <th className="text-left px-3 py-2 w-24">Tiers (id)</th>
                <th className="text-right px-3 py-2 w-32">Débit</th>
                <th className="text-right px-3 py-2 w-32">Crédit</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {lignes.map((l) => (
                <tr key={l.key}>
                  <td className="px-3 py-2">
                    <SearchSelect<Compte>
                      fetchOptions={(q) => listComptes({ q })}
                      value={l.compteId}
                      onChange={(value, record) =>
                        patchLigne(l.key, {
                          compteId: value as number | null,
                          compteLabel: record ? `${record.numero} — ${record.libelle}` : "",
                        })
                      }
                      getOptionLabel={(c) => `${c.numero} — ${c.libelle}`}
                      initialLabel={l.compteLabel}
                      placeholder="Rechercher un compte…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={l.libelle}
                      onChange={(e) => patchLigne(l.key, { libelle: e.target.value })}
                      className={`${FIELD} w-full`}
                      placeholder="Optionnel"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={l.tiersId}
                      onChange={(e) => patchLigne(l.key, { tiersId: e.target.value.replace(/\D/g, "") })}
                      className={`${FIELD} w-full`}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={l.debit}
                      onChange={(e) => patchLigne(l.key, { debit: e.target.value, credit: e.target.value ? "" : l.credit })}
                      className={`${FIELD} w-full text-right`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={l.credit}
                      onChange={(e) => patchLigne(l.key, { credit: e.target.value, debit: e.target.value ? "" : l.debit })}
                      className={`${FIELD} w-full text-right`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => retirerLigne(l.key)} className="text-outline hover:text-error transition-colors">
                      <DeleteOutlined style={{ fontSize: 18 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-row-alt font-semibold">
                <td className="px-3 py-2" colSpan={3}>Totaux</td>
                <td className={`px-3 py-2 text-right ${!equilibree ? "text-error" : "text-on-surface"}`}>{montant(totalDebit)}</td>
                <td className={`px-3 py-2 text-right ${!equilibree ? "text-error" : "text-on-surface"}`}>{montant(totalCredit)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-hairline">
          <button type="button" onClick={ajouterLigne} className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:text-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter une ligne
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={enregistrer}
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer en brouillon"}
        </button>
        {!equilibree && <span className="text-body-sm text-on-surface-variant">Non équilibrée</span>}
      </div>
    </div>
  );
}
