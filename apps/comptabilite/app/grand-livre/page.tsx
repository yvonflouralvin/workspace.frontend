"use client";

import { useEffect, useState } from "react";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { DashboardShell } from "@/components/DashboardShell";
import { listComptes, listExercices, grandLivre, type Compte, type Exercice, type MouvementGrandLivre } from "@/lib/compta-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GrandLivrePage() {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [exerciceId, setExerciceId] = useState("");
  const [compteId, setCompteId] = useState<number | null>(null);
  const [compteLabel, setCompteLabel] = useState("");
  const [mouvements, setMouvements] = useState<MouvementGrandLivre[] | null>(null);

  useEffect(() => {
    listExercices().then((list) => {
      setExercices(list);
      const ouvert = list.find((e) => e.statut === "OUVERT");
      if (ouvert) setExerciceId(String(ouvert.id));
    });
  }, []);

  useEffect(() => {
    if (compteId && exerciceId) {
      grandLivre(compteId, Number(exerciceId)).then(setMouvements);
    } else {
      setMouvements(null);
    }
  }, [compteId, exerciceId]);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Grand livre</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Mouvements d&rsquo;un compte, avec solde cumulé.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[280px]">
            <span className="block text-label-sm uppercase text-outline mb-1">Compte</span>
            <SearchSelect<Compte>
              fetchOptions={(q) => listComptes({ q })}
              value={compteId}
              onChange={(value, record) => {
                setCompteId(value as number | null);
                setCompteLabel(record ? `${record.numero} — ${record.libelle}` : "");
              }}
              getOptionLabel={(c) => `${c.numero} — ${c.libelle}`}
              initialLabel={compteLabel}
              placeholder="Rechercher un compte…"
            />
          </div>
          <div>
            <span className="block text-label-sm uppercase text-outline mb-1">Exercice</span>
            <select value={exerciceId} onChange={(e) => setExerciceId(e.target.value)} className={FIELD}>
              {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
            </select>
          </div>
        </div>

        {!compteId ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">Sélectionnez un compte pour afficher ses mouvements.</p>
          </div>
        ) : mouvements === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : mouvements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">Aucun mouvement sur cet exercice.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Écriture</th>
                    <th className="text-left px-3 py-2">Journal</th>
                    <th className="text-left px-3 py-2">Libellé</th>
                    <th className="text-right px-3 py-2">Débit</th>
                    <th className="text-right px-3 py-2">Crédit</th>
                    <th className="text-right px-3 py-2">Solde cumulé</th>
                    <th className="text-left px-3 py-2">Lettrage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {mouvements.map((m, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{m.date_ecriture}</td>
                      <td className="px-3 py-2">
                        <a href={`/ecritures/${m.ecriture_id}`} className="text-primary hover:underline font-mono">{m.ecriture_numero}</a>
                      </td>
                      <td className="px-3 py-2">{m.journal_code}</td>
                      <td className="px-3 py-2">{m.libelle}</td>
                      <td className="px-3 py-2 text-right">{m.debit ? montant(m.debit) : ""}</td>
                      <td className="px-3 py-2 text-right">{m.credit ? montant(m.credit) : ""}</td>
                      <td className="px-3 py-2 text-right font-semibold">{montant(m.solde_cumule)}</td>
                      <td className="px-3 py-2 font-mono">{m.lettrage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
