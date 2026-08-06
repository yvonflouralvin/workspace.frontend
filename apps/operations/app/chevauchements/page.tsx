"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircleOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { heureCourte, jourCourt, operationsApi, type Affectation } from "@/lib/operations-api";

/** Ce qui a été forcé, réuni en un écran.
 *
 *  Une trace que personne ne consulte ne sert à rien : cet écran est la raison
 *  pour laquelle on enregistre les chevauchements au lieu de les recalculer. */
export default function ChevauchementsPage() {
  const [lignes, setLignes] = useState<Affectation[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setLignes(await operationsApi.chevauchements());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les chevauchements.");
      setLignes([]);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <h1 className="font-display text-headline-md text-on-surface">Chevauchements</h1>
        <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
          Les affectations maintenues malgré un conflit. La justification donnée au moment
          du forçage reste attachée : c&apos;est ce qui permet de comprendre l&apos;exception
          plus tard.
        </p>

        {erreur && <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>}

        {lignes === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : lignes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <CheckCircleOutlined style={{ fontSize: 28 }} className="text-secondary" />
            <p className="mt-2 text-body-md text-on-surface">Aucun chevauchement.</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Aucune ressource n&apos;est affectée à deux endroits en même temps.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            {lignes.map((a) => (
              <article key={a.id} className="rounded-2xl border border-error bg-error-container/20 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="flex items-center gap-2 text-body-md font-medium text-on-surface">
                    <WarningAmberOutlined style={{ fontSize: 16 }} className="text-error" />
                    {a.ressource}
                  </p>
                  <Link href={`/plannings/${a.planning_id}`} className="text-label-md text-primary">
                    Ouvrir le planning
                  </Link>
                </div>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {jourCourt(a.debut)} {heureCourte(a.debut)}–{heureCourte(a.fin)} · {a.heures} h
                  {a.site ? ` · ${a.site}` : ""}
                  {a.objet ? ` · ${a.objet}` : ""}
                </p>
                {a.motif_forcage && (
                  <p className="mt-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface">
                    <span className="text-label-md uppercase text-outline">Justification </span>
                    {a.motif_forcage}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
