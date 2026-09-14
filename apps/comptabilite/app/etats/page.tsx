"use client";

import { Fragment, useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { AideFlottante } from "@/components/AideFlottante";
import { AIDE_ETATS } from "@/components/aide-contenu";
import { listExercices, getBilan, getCompteResultat, type Exercice, type EtatFinancier } from "@/lib/compta-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TableEtat({ etat, totalLabel }: { etat: EtatFinancier; totalLabel: string }) {
  const parClasse = new Map<number, { libelle: string; montant: number }[]>();
  for (const l of etat.lignes) {
    const arr = parClasse.get(l.classe) ?? [];
    arr.push({ libelle: l.libelle, montant: l.montant });
    parClasse.set(l.classe, arr);
  }
  const classes = [...parClasse.keys()].sort((a, b) => a - b);

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
              <th className="text-left px-3 py-2">Poste</th>
              <th className="text-right px-3 py-2">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {classes.map((c) => (
              <Fragment key={c}>
                <tr className="bg-surface-row-alt/60">
                  <td className="px-3 py-2 font-semibold" colSpan={2}>Classe {c}</td>
                </tr>
                {parClasse.get(c)!.map((l, i) => (
                  <tr key={`${c}-${i}`}>
                    <td className="px-3 py-2 pl-6">{l.libelle}</td>
                    <td className="px-3 py-2 text-right">{montant(l.montant)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-row-alt font-semibold">
              <td className="px-3 py-2">{totalLabel}</td>
              <td className="px-3 py-2 text-right">{montant(etat.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function EtatsPage() {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [exerciceId, setExerciceId] = useState("");
  const [onglet, setOnglet] = useState<"bilan" | "resultat">("bilan");
  const [bilan, setBilan] = useState<EtatFinancier | null>(null);
  const [resultat, setResultat] = useState<EtatFinancier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listExercices().then((list) => {
      setExercices(list);
      const ouvert = list.find((e) => e.statut === "OUVERT");
      if (ouvert) setExerciceId(String(ouvert.id));
    });
  }, []);

  useEffect(() => {
    if (!exerciceId) return;
    setError(null);
    setBilan(null);
    setResultat(null);
    const id = Number(exerciceId);
    getBilan(id).then(setBilan).catch((e) => setError(e.message));
    getCompteResultat(id).then(setResultat).catch((e) => setError(e.message));
  }, [exerciceId]);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">États financiers</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Bilan et compte de résultat, regroupés par classe OHADA — format simplifié.
            </p>
          </div>
          <select value={exerciceId} onChange={(e) => setExerciceId(e.target.value)} className={FIELD}>
            {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-outline-soft bg-surface-container-lowest p-1 w-fit">
          <button
            type="button"
            onClick={() => setOnglet("bilan")}
            className={`h-8 px-3.5 rounded-md text-body-sm font-semibold transition-colors ${onglet === "bilan" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"}`}
          >
            Bilan
          </button>
          <button
            type="button"
            onClick={() => setOnglet("resultat")}
            className={`h-8 px-3.5 rounded-md text-body-sm font-semibold transition-colors ${onglet === "resultat" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"}`}
          >
            Compte de résultat
          </button>
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}

        {onglet === "bilan" ? (
          bilan === null ? (
            <p className="text-body-md text-on-surface-variant">Chargement…</p>
          ) : (
            <TableEtat etat={bilan} totalLabel="Total (actif − passif, doit être nul)" />
          )
        ) : resultat === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <TableEtat etat={resultat} totalLabel="Résultat (produits − charges)" />
        )}
      </div>
      <AideFlottante titre={AIDE_ETATS.titre}>{AIDE_ETATS.contenu}</AideFlottante>
    </DashboardShell>
  );
}
