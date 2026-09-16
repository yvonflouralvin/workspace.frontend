"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { AideFlottante } from "@/components/AideFlottante";
import { AIDE_ECRITURES } from "@/components/aide-contenu";
import { EcritureEditor } from "@/components/EcritureEditor";
import { listJournaux, listExercices, getConfiguration, type Journal, type Exercice } from "@/lib/compta-api";
import Link from "next/link";

export default function NouvelleEcriturePage() {
  const router = useRouter();
  const [journaux, setJournaux] = useState<Journal[] | null>(null);
  const [exercices, setExercices] = useState<Exercice[] | null>(null);
  const [deviseTenue, setDeviseTenue] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    listJournaux().then(setJournaux);
    listExercices().then(setExercices);
    getConfiguration().then((c) => setDeviseTenue(c.devise_tenue));
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

        {journaux === null || exercices === null || deviseTenue === undefined ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : !deviseTenue ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center space-y-2">
            <p className="text-body-md text-on-surface-variant">
              La devise de tenue doit être configurée avant de saisir une écriture.
            </p>
            <Link href="/parametres/devise" className="inline-block text-body-sm font-semibold text-primary hover:underline">
              Configurer la devise de tenue →
            </Link>
          </div>
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
      <AideFlottante titre={AIDE_ECRITURES.titre}>{AIDE_ECRITURES.contenu}</AideFlottante>
    </DashboardShell>
  );
}
