"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { listExercices, getBalance, type Exercice, type LigneBalance } from "@/lib/compta-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BalancePage() {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [exerciceId, setExerciceId] = useState("");
  const [lignes, setLignes] = useState<LigneBalance[] | null>(null);

  useEffect(() => {
    listExercices().then((list) => {
      setExercices(list);
      const ouvert = list.find((e) => e.statut === "OUVERT");
      if (ouvert) setExerciceId(String(ouvert.id));
    });
  }, []);

  useEffect(() => {
    if (exerciceId) getBalance(Number(exerciceId)).then(setLignes);
  }, [exerciceId]);

  const totaux = useMemo(() => {
    if (!lignes) return null;
    return lignes.reduce(
      (acc, l) => ({
        debit: acc.debit + l.total_debit,
        credit: acc.credit + l.total_credit,
        solde_d: acc.solde_d + l.solde_debiteur,
        solde_c: acc.solde_c + l.solde_crediteur,
      }),
      { debit: 0, credit: 0, solde_d: 0, solde_c: 0 },
    );
  }, [lignes]);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Balance</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Totaux mouvementés et soldes de tous les comptes, par exercice.
            </p>
          </div>
          <div>
            <select value={exerciceId} onChange={(e) => setExerciceId(e.target.value)} className={FIELD}>
              {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
            </select>
          </div>
        </div>

        {lignes === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : lignes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">Aucun mouvement sur cet exercice.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                    <th className="text-left px-3 py-2">Compte</th>
                    <th className="text-right px-3 py-2">Débit</th>
                    <th className="text-right px-3 py-2">Crédit</th>
                    <th className="text-right px-3 py-2">Solde débiteur</th>
                    <th className="text-right px-3 py-2">Solde créditeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {lignes.map((l) => (
                    <tr key={l.compte_id}>
                      <td className="px-3 py-2 font-mono">{l.numero} — {l.libelle}</td>
                      <td className="px-3 py-2 text-right">{montant(l.total_debit)}</td>
                      <td className="px-3 py-2 text-right">{montant(l.total_credit)}</td>
                      <td className="px-3 py-2 text-right">{l.solde_debiteur ? montant(l.solde_debiteur) : ""}</td>
                      <td className="px-3 py-2 text-right">{l.solde_crediteur ? montant(l.solde_crediteur) : ""}</td>
                    </tr>
                  ))}
                </tbody>
                {totaux && (
                  <tfoot>
                    <tr className="bg-surface-row-alt font-semibold">
                      <td className="px-3 py-2">Totaux</td>
                      <td className="px-3 py-2 text-right">{montant(totaux.debit)}</td>
                      <td className="px-3 py-2 text-right">{montant(totaux.credit)}</td>
                      <td className="px-3 py-2 text-right">{montant(totaux.solde_d)}</td>
                      <td className="px-3 py-2 text-right">{montant(totaux.solde_c)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
