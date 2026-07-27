"use client";

import { RichTextEditor } from "@repo/ui/RichTextEditor";
import {
  PHASE_STATUS_LABELS,
  PHASE_STATUS_ORDER,
  PHASE_STATUS_TONES,
} from "@/app/lib/projects-api";
import { usePhase } from "./phase-context";

const LABEL = "block text-label-sm uppercase text-outline";

export default function PhaseOverviewPage() {
  const { phase, queue, canManage } = usePhase();
  const tone = PHASE_STATUS_TONES[phase.status] ?? PHASE_STATUS_TONES.A_VENIR!;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div>
        <p className={`${LABEL} mb-2`}>Aperçu de la phase</p>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <RichTextEditor
            value={phase.description_rich}
            fallbackText={phase.description}
            editable={canManage}
            placeholder="Objectif de la phase, ce qui change par rapport à la précédente…"
            className="min-h-[16rem]"
            onChange={canManage ? (json) => queue({ description_rich: json }) : undefined}
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          {canManage ? (
            <select
              value={phase.status}
              onChange={(e) => queue({ status: e.target.value })}
              className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary"
            >
              {PHASE_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PHASE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-on-surface">
              <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
              {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
            </span>
          )}
        </MetaRow>

        <MetaRow label="Début prévu">
          <PhaseDate value={phase.start_planned} editable={canManage} onChange={(v) => queue({ start_planned: v })} />
        </MetaRow>
        <MetaRow label="Fin prévue">
          <PhaseDate value={phase.end_planned} editable={canManage} onChange={(v) => queue({ end_planned: v })} />
        </MetaRow>
        <MetaRow label="Début réel">
          <PhaseDate value={phase.start_real} editable={canManage} onChange={(v) => queue({ start_real: v })} />
        </MetaRow>
        <MetaRow label="Fin réelle">
          <PhaseDate value={phase.end_real} editable={canManage} onChange={(v) => queue({ end_real: v })} />
        </MetaRow>

        <MetaRow label="Éléments">
          <span className="text-body-sm font-semibold text-on-surface tabular-nums">{phase.task_count ?? 0}</span>
        </MetaRow>
      </aside>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}

function PhaseDate({
  value,
  editable,
  onChange,
}: {
  value: string | null;
  editable: boolean;
  onChange: (value: string | null) => void;
}) {
  if (!editable) {
    return (
      <span className="text-body-sm text-on-surface">
        {value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
      </span>
    );
  }
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
      className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
    />
  );
}
