"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowBackOutlined,
  CloudDoneOutlined,
  CloudOffOutlined,
  CloudSyncOutlined,
} from "@mui/icons-material";
import { projectsApi, PHASE_STATUS_LABELS, PHASE_STATUS_TONES, type Phase } from "@/app/lib/projects-api";
import { useProject } from "../../project-context";
import { PhaseProvider, type PhaseSaveState } from "./phase-context";
import { phaseSectionForPathname, phaseSectionsFor } from "./phase-sections";

const SAVE_DELAY_MS = 800;

export default function PhaseLayout({ children }: { children: ReactNode }) {
  const { phaseId } = useParams<{ phaseId: string }>();
  const pathname = usePathname();
  const { projectId, project, phases, reloadPhases, canManage } = useProject();
  const phase = phases.find((p) => p.id === Number(phaseId)) ?? null;

  const [name, setName] = useState(phase?.name ?? "");
  const [saveState, setSaveState] = useState<PhaseSaveState>("idle");

  const pending = useRef<Partial<Phase>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le nom local suit la phase résolue depuis le contexte (au chargement).
  useEffect(() => {
    if (phase) setName(phase.name);
  }, [phase?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const phaseIdNum = phase?.id;

  const flush = useCallback(async () => {
    if (!phaseIdNum) return;
    const body = pending.current;
    pending.current = {};
    if (!Object.keys(body).length) return;
    setSaveState("saving");
    try {
      await projectsApi.updatePhase(phaseIdNum, body);
      await reloadPhases();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [phaseIdNum, reloadPhases]);

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
        <BackToPhases projectId={projectId} />
        <p className="text-body-md text-error">Phase introuvable.</p>
      </div>
    );
  }

  const sections = phaseSectionsFor(phase);
  const current = phaseSectionForPathname(pathname, projectId, phase.id, sections);
  const tone = PHASE_STATUS_TONES[phase.status] ?? PHASE_STATUS_TONES.A_VENIR!;

  return (
    <div>
      <BackToPhases projectId={projectId} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/projects/${projectId}`}
            className="inline-block max-w-full truncate text-label-md font-medium text-outline hover:text-primary transition-colors"
          >
            {project.name}
          </Link>
          {canManage ? (
            <input
              aria-label="Nom de la phase"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) queue({ name: e.target.value.trim() });
              }}
              placeholder="Nom de la phase"
              className="mt-0.5 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
            />
          ) : (
            <h1 className="mt-0.5 font-display text-headline-md text-on-surface truncate">{phase.name}</h1>
          )}
        </div>

        <div className="flex-none flex items-center gap-3 pt-4">
          <SaveIndicator state={saveState} />
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
            <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
            {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
        {sections.map((section) => {
          const active = section.key === current?.key;
          const label = (
            <>
              <span className="inline-flex items-center">{section.icon}</span>
              {section.label}
              {section.soon && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-outline bg-surface-container rounded px-1.5 py-0.5">
                  Bientôt
                </span>
              )}
            </>
          );
          const className = `inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
            active
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`;

          if (section.soon) {
            return (
              <span
                key={section.key}
                aria-disabled
                className={`${className} text-outline-variant cursor-not-allowed hover:text-outline-variant`}
              >
                {label}
              </span>
            );
          }
          return (
            <Link
              key={section.key}
              href={`/projects/${projectId}/phases/${phase.id}${section.path}`}
              className={className}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <PhaseProvider value={{ phase, queue, saveState, canManage }}>{children}</PhaseProvider>
    </div>
  );
}

function BackToPhases({ projectId }: { projectId: number }) {
  return (
    <Link
      href={`/projects/${projectId}/phases`}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Phases
    </Link>
  );
}

function SaveIndicator({ state }: { state: PhaseSaveState }) {
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
