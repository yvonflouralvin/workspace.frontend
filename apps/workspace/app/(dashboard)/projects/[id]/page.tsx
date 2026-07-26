"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CloudDoneOutlined,
  CloudOffOutlined,
  CloudSyncOutlined,
  AccountTreeOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import {
  projectsApi,
  phasesVisible,
  PROJECT_COLORS,
  PROJECT_STATUS_DOTS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  type Project,
} from "@/app/lib/projects-api";
import { useProject } from "./project-context";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 800;
const LABEL = "block text-label-sm uppercase text-outline";

export default function ProjectOverviewPage() {
  const { projectId, project, setProject, tasks, phases, members, canManage } = useProject();
  const showPhases = phasesVisible(phases);
  const [name, setName] = useState(project.name);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const pending = useRef<Partial<Project>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const body = pending.current;
    pending.current = {};
    if (!Object.keys(body).length) return;
    setSaveState("saving");
    try {
      const updated = await projectsApi.updateProject(projectId, body);
      setProject(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [projectId, setProject]);

  const queue = useCallback(
    (patch: Partial<Project>) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  // Quitter l'aperçu ne doit pas perdre une frappe en cours.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush]
  );

  const done = useMemo(() => tasks.filter((t) => t.status === "TERMINE").length, [tasks]);
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const lead = members.find((m) => m.id === project.lead_user_id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div>
        <div className="flex items-start justify-between gap-4">
          <label className={LABEL} htmlFor="project-name">
            Nom du projet
          </label>
          <SaveIndicator state={saveState} />
        </div>
        <input
          id="project-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) queue({ name: e.target.value.trim() });
          }}
          disabled={!canManage}
          placeholder="Nom du projet"
          className="mt-1 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors disabled:hover:border-transparent"
        />
        {!name.trim() && <p className="mt-1 text-label-md text-error">Le nom est requis.</p>}

        <p className={`${LABEL} mt-6 mb-2`}>Description</p>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <RichTextEditor
            value={project.description_rich}
            fallbackText={project.description}
            editable={canManage}
            placeholder="Décrivez le projet…"
            className="min-h-[16rem]"
            onChange={canManage ? (json) => queue({ description_rich: json }) : undefined}
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          {canManage ? (
            <select
              value={project.status}
              onChange={(e) => queue({ status: e.target.value })}
              className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary"
            >
              {PROJECT_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-on-surface">
              <span className={`w-2 h-2 rounded-full ${PROJECT_STATUS_DOTS[project.status] ?? ""}`} />
              {PROJECT_STATUS_LABELS[project.status] ?? project.status}
            </span>
          )}
        </MetaRow>

        <MetaRow label="Responsable">
          {canManage ? (
            <select
              value={project.lead_user_id ?? ""}
              onChange={(e) =>
                queue({ lead_user_id: e.target.value ? Number(e.target.value) : null })
              }
              className="h-8 max-w-[150px] rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="">Non assigné</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : lead ? (
            <span className="inline-flex items-center gap-2 text-body-sm text-on-surface">
              <Avatar name={lead.name} size={22} />
              {lead.name}
            </span>
          ) : (
            <span className="text-body-sm text-outline">—</span>
          )}
        </MetaRow>

        <MetaRow label="Début">
          <DateValue
            value={project.start_date}
            editable={canManage}
            onChange={(v) => queue({ start_date: v })}
          />
        </MetaRow>

        <MetaRow label="Échéance">
          <DateValue
            value={project.due_date}
            editable={canManage}
            onChange={(v) => queue({ due_date: v })}
          />
        </MetaRow>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-on-surface-variant">Progression</span>
            <span className="text-body-sm font-semibold text-on-surface">{pct} %</span>
          </div>
          <div className="flex items-center gap-2.5 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full bg-secondary rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-label-md text-outline">
              {done} / {tasks.length}
            </span>
          </div>
        </div>

        <MetaRow label="Clé">
          <span className="font-mono text-body-sm text-on-surface" title="Non modifiable">
            {project.key}
          </span>
        </MetaRow>

        {/* Structure : découpage en phases. Discret quand le projet n'a qu'une phase
            implicite — l'utilisateur qui veut une simple liste ne voit rien d'imposé. */}
        {showPhases ? (
          <MetaRow label="Structure">
            <Link
              href={`/projects/${projectId}/phases`}
              className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
            >
              {phases.length} phase{phases.length > 1 ? "s" : ""}
              <ChevronRightOutlined style={{ fontSize: 15 }} />
            </Link>
          </MetaRow>
        ) : canManage ? (
          <div className="px-4 py-3">
            <Link
              href={`/projects/${projectId}/phases`}
              className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              <AccountTreeOutlined style={{ fontSize: 16 }} />
              Découper en phases
            </Link>
          </div>
        ) : null}

        {canManage && (
          <div className="px-4 py-3">
            <p className="text-body-sm text-on-surface-variant mb-2">Couleur</p>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_COLORS.map((color) => {
                const active = (project.color ?? "#3525cd") === color;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Couleur ${color}`}
                    onClick={() => queue({ color })}
                    style={{ background: color }}
                    className={`w-[26px] h-[26px] rounded-lg transition-transform ${
                      active ? "ring-2 ring-offset-2 ring-primary scale-105" : "hover:scale-105"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
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

function DateValue({
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
        {value
          ? new Date(value).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "—"}
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
    saving: {
      icon: <CloudSyncOutlined style={{ fontSize: 16 }} />,
      label: "Enregistrement…",
      tone: "text-on-surface-variant",
    },
    saved: {
      icon: <CloudDoneOutlined style={{ fontSize: 16 }} />,
      label: "Enregistré",
      tone: "text-secondary",
    },
    error: {
      icon: <CloudOffOutlined style={{ fontSize: 16 }} />,
      label: "Échec de l'enregistrement",
      tone: "text-error",
    },
  } as const;
  const { icon, label, tone } = map[state];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 text-label-md ${tone}`}>
      {icon}
      {label}
    </span>
  );
}
