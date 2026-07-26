"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowBackOutlined,
  CloudDoneOutlined,
  CloudOffOutlined,
  CloudSyncOutlined,
} from "@mui/icons-material";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import {
  projectsApi,
  PHASE_STATUS_LABELS,
  PHASE_STATUS_ORDER,
  PHASE_STATUS_TONES,
  type Phase,
} from "@/app/lib/projects-api";
import { useProject } from "../../project-context";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 800;
const LABEL = "block text-label-sm uppercase text-outline";

export default function PhaseOverviewPage() {
  const { phaseId } = useParams<{ phaseId: string }>();
  const { projectId, phases, reloadPhases, canManage } = useProject();
  const phase = phases.find((p) => p.id === Number(phaseId)) ?? null;

  const [name, setName] = useState(phase?.name ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const pending = useRef<Partial<Phase>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le nom local suit la phase résolue depuis le contexte (au chargement).
  useEffect(() => {
    if (phase) setName(phase.name);
  }, [phase?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async () => {
    if (!phase) return;
    const body = pending.current;
    pending.current = {};
    if (!Object.keys(body).length) return;
    setSaveState("saving");
    try {
      await projectsApi.updatePhase(phase.id, body);
      await reloadPhases();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [phase?.id, reloadPhases]); // eslint-disable-line react-hooks/exhaustive-deps

  const queue = useCallback(
    (patch: Partial<Phase>) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush]
  );

  if (!phase) {
    return (
      <div className="space-y-4">
        <Link
          href={`/projects/${projectId}/phases`}
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} /> Phases
        </Link>
        <p className="text-body-md text-error">Phase introuvable.</p>
      </div>
    );
  }

  const tone = PHASE_STATUS_TONES[phase.status] ?? PHASE_STATUS_TONES.A_VENIR!;

  return (
    <div>
      <Link
        href={`/projects/${projectId}/phases`}
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} /> Phases
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div>
          <div className="flex items-start justify-between gap-4">
            <label className={LABEL} htmlFor="phase-name">
              Nom de la phase
            </label>
            <SaveIndicator state={saveState} />
          </div>
          <input
            id="phase-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) queue({ name: e.target.value.trim() });
            }}
            disabled={!canManage}
            placeholder="Nom de la phase"
            className="mt-1 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors disabled:hover:border-transparent"
          />

          <p className={`${LABEL} mt-6 mb-2`}>Aperçu de la phase</p>
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

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: <CloudSyncOutlined style={{ fontSize: 16 }} />, label: "Enregistrement…", tone: "text-on-surface-variant" },
    saved: { icon: <CloudDoneOutlined style={{ fontSize: 16 }} />, label: "Enregistré", tone: "text-secondary" },
    error: { icon: <CloudOffOutlined style={{ fontSize: 16 }} />, label: "Échec de l'enregistrement", tone: "text-error" },
  } as const;
  const { icon, label, tone } = map[state];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 text-label-md ${tone}`}>
      {icon}
      {label}
    </span>
  );
}
