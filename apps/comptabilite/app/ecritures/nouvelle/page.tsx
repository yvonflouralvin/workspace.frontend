"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { EcritureEditor } from "@/components/EcritureEditor";
import { listJournaux, listExercices, type Journal, type Exercice } from "@/lib/compta-api";

export default function NouvelleEcriturePage() {
  const router = useRouter();
  const [journaux, setJournaux] = useState<Journal[] | null>(null);
  const [exercices, setExercices] = useState<Exercice[] | null>(null);

  useEffect(() => {
    listJournaux().then(setJournaux);
    listExercices().then(setExercices);
  }, []);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Nouvelle écriture</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Enregistrée en brouillon — à valider ensuite depuis sa fiche.
          </p>
        </div>

        {journaux === null || exercices === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : journaux.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">
              Aucun journal — créez-en un dans « Journaux » avant de saisir une écriture.
            </p>
          </div>
        ) : exercices.filter((e) => e.statut === "OUVERT").length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">
              Aucun exercice ouvert — créez-en un dans « Exercices » avant de saisir une écriture.
            </p>
          </div>
        ) : (
          <EcritureEditor
            journaux={journaux}
            exercices={exercices}
            onSaved={(ec) => router.push(`/ecritures/${ec.id}`)}
            onCancel={() => router.push("/ecritures")}
          />
        )}
      </div>
    </DashboardShell>
  );
}
