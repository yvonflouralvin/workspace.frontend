"use client";

import Link from "next/link";
import { ChevronRightOutlined, ViewListOutlined } from "@mui/icons-material";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { STATUT_PHASE_LABELS, type Phase } from "@/lib/bfm-missions-api";
import { useDiffere } from "@/lib/differe";
import { useMission } from "../../mission-context";
import { LABEL, MetaRow } from "../../ui";
import { usePhase } from "./phase-context";

export default function ApercuPhasePage() {
  const { missionId } = useMission();
  const { phase, taches, enregistrer, erreur } = usePhase();
  const pousserDescription = useDiffere((json: string) => enregistrer({ description_rich: json }));

  const terminees = taches.filter((t) => t.statut === "TERMINEE").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div>
        {erreur && (
          <p className="mb-3 text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{erreur}</p>
        )}
        <p className={`${LABEL} mb-2`}>Aperçu de la phase</p>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <RichTextEditor
            key={phase.id}
            value={phase.description_rich}
            fallbackText={phase.description}
            placeholder="Objectif de la phase, ce qui change par rapport à la précédente…"
            className="min-h-[16rem]"
            onChange={pousserDescription}
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          <select
            value={phase.statut}
            onChange={(e) => void enregistrer({ statut: e.target.value as Phase["statut"] })}
            className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary"
          >
            {Object.entries(STATUT_PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </MetaRow>
        <MetaRow label="Tâches">
          <span className="text-body-sm font-semibold text-on-surface tabular-nums">{taches.length}</span>
        </MetaRow>
        <MetaRow label="Terminées">
          <span className="text-body-sm font-semibold text-on-surface tabular-nums">
            {terminees}
            {taches.length > 0 && <span className="font-normal text-outline"> / {taches.length}</span>}
          </span>
        </MetaRow>

        <Link
          href={`/missions/${missionId}/phases/${phase.id}/taches`}
          className="flex items-center justify-between gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors rounded-b-2xl"
        >
          <span className="inline-flex items-center gap-2 text-body-sm font-medium">
            <ViewListOutlined style={{ fontSize: 17 }} />
            Voir les tâches
          </span>
          <ChevronRightOutlined style={{ fontSize: 18 }} />
        </Link>
      </aside>
    </div>
  );
}
