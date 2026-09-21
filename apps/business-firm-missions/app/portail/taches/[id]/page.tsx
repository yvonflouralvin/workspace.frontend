"use client";

import { useEffect, useMemo, useState } from "react";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { FilCommentaires } from "@repo/ui/FilCommentaires";
import { STATUT_TACHE_LABELS } from "@/lib/bfm-missions-api";
import type { StatutClient } from "@/lib/bfm-portail-api";
import { estTerminee } from "@/app/missions/[id]/ui";
import { apiFilTache, listMentionnablesPortail } from "@/lib/fil-tache-api";
import { dateFr, enRetard } from "@/lib/format";
import { usePortailTache } from "./tache-context";

const STATUTS: StatutClient[] = ["A_FAIRE", "EN_COURS", "TERMINEE"];

export default function ApercuTachePortailPage() {
  const { tache, avancer, erreur } = usePortailTache();
  const [equipe, setEquipe] = useState<{ id: number; nom: string }[]>([]);

  useEffect(() => {
    listMentionnablesPortail(tache.id).then(setEquipe).catch(() => setEquipe([]));
  }, [tache.id]);

  const api = useMemo(() => apiFilTache("portail", tache.id), [tache.id]);
  const retard = enRetard(tache.due_date, estTerminee(tache.statut));
  const aDescription = Boolean(tache.description_rich || tache.description);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="min-w-0 space-y-6">
        {erreur && <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>}

        {aDescription && (
          <div>
            <p className="mb-2 block text-label-sm uppercase text-outline">Ce qui est attendu</p>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              <RichTextEditor
                key={tache.id}
                value={tache.description_rich}
                fallbackText={tache.description}
                editable={false}
                className="min-h-[6rem]"
              />
            </div>
          </div>
        )}

        <FilCommentaires
          api={api}
          membres={equipe}
          canWrite
          titre="Discussion avec Business Firm"
        />
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <div className="px-4 py-3">
          <p className="mb-2 text-body-sm text-on-surface-variant">Avancement</p>
          {tache.statut === "VALIDEE" && (
            <p className="text-body-sm text-status-done">Cette tâche a été validée par Business Firm.</p>
          )}
          {tache.statut === "A_REVOIR" && (
            <p className="mb-2 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
              Business Firm vous demande de revoir cette tâche : consultez la discussion, puis reprenez-la.
            </p>
          )}
          {tache.statut === "TERMINEE" && (
            <p className="mb-2 text-body-sm text-on-surface-variant">Terminée — en attente de validation par Business Firm.</p>
          )}
          <div className="flex flex-col gap-1.5">
            {tache.statut !== "VALIDEE" && (tache.statut === "A_REVOIR" ? (["EN_COURS"] as StatutClient[]) : STATUTS).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void avancer(s)}
                className={`h-9 rounded-lg border px-3 text-left text-body-sm font-medium transition-colors ${
                  tache.statut === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {tache.statut === "A_REVOIR" ? "Reprendre" : STATUT_TACHE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-body-sm text-on-surface-variant">Échéance</span>
          <span className={`text-body-sm ${retard ? "font-semibold text-error" : "text-on-surface"}`}>
            {dateFr(tache.due_date)}
          </span>
        </div>
      </aside>
    </div>
  );
}
