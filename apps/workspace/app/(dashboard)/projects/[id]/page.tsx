"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  CloudDoneOutlined,
  CloudOffOutlined,
  CloudSyncOutlined,
  AccountTreeOutlined,
  ChevronRightOutlined,
  FlagOutlined,
  GroupOutlined,
} from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import {
  projectsApi,
  phasesVisible,
  PROJECT_COLORS,
  PROJECT_STATUS_DOTS,
  PROJECT_ISSUE_LABELS,
  PROJECT_ISSUE_ORDER,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
  type Project,
  type ProjectIssue,
} from "@/app/lib/projects-api";
import { useAutosave, type EtatSauvegarde } from "@/app/lib/autosave";
import { EchecAutosave } from "@/components/projects/EchecAutosave";
import { SelecteurPersonne } from "@/components/projects/SelecteurPersonne";
import { useProject } from "./project-context";

const LABEL = "block text-label-sm uppercase text-outline";

export default function ProjectOverviewPage() {
  const { projectId, project, setProject, tasks, phases, jalons, members, canManage } = useProject();
  const showPhases = phasesVisible(phases);
  const [name, setName] = useState(project.name);

  const { queue, etat, echec, oublierEchec } = useAutosave<Project>(
    useCallback(
      async (patch) => setProject(await projectsApi.updateProject(projectId, patch)),
      [projectId, setProject]
    )
  );

  const done = useMemo(() => tasks.filter((t) => t.categorie === "termine").length, [tasks]);
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const lead = members.find((m) => m.id === project.lead_user_id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div>
        <div className="flex items-start justify-between gap-4">
          <label className={LABEL} htmlFor="project-name">
            Nom du projet
          </label>
          <SaveIndicator state={etat} />
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
        {echec && (
          <div className="mt-3">
            <EchecAutosave echec={echec} projectId={projectId} onFermer={oublierEchec} />
          </div>
        )}

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

        {/* L'ISSUE n'est pas le statut : archiver dit où le projet est rangé,
            l'issue dit comment il s'est terminé. Ne s'affiche qu'une fois le
            projet sorti des actifs — un projet en cours n'a pas d'issue. */}
        {project.status !== "ACTIF" && (
          <MetaRow label="Issue">
            {canManage ? (
              <select
                value={project.issue ?? ""}
                onChange={(e) =>
                  queue({ issue: (e.target.value || null) as ProjectIssue | null })
                }
                className="h-8 max-w-[150px] rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="">Non renseignée</option>
                {PROJECT_ISSUE_ORDER.map((i) => (
                  <option key={i} value={i}>
                    {PROJECT_ISSUE_LABELS[i]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-body-sm text-on-surface">
                {project.issue ? PROJECT_ISSUE_LABELS[project.issue] : "—"}
              </span>
            )}
          </MetaRow>
        )}

        <MetaRow label="Responsable">
          {canManage ? (
            <span className="w-[190px]">
              <SelecteurPersonne
                valeur={{ userId: project.lead_user_id ?? null, groupeId: null }}
                membres={members}
                onChange={(choix) => queue({ lead_user_id: choix.userId })}
                placeholder="Rechercher un responsable…"
                vide="Non assigné"
              />
            </span>
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

        {/* Gouvernance : les jalons. L'onglet du projet n'apparaît qu'une fois
            un jalon posé — sans cette entrée, le PREMIER serait incréable sur un
            projet neuf, dont l'onglet Phases est lui aussi masqué. */}
        {jalons.length > 0 ? (
          <MetaRow label="Gouvernance">
            <Link
              href={`/projects/${projectId}/jalons`}
              className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
            >
              {jalons.length} jalon{jalons.length > 1 ? "s" : ""}
              <ChevronRightOutlined style={{ fontSize: 15 }} />
            </Link>
          </MetaRow>
        ) : canManage ? (
          <div className="px-4 py-3">
            <Link
              href={`/projects/${projectId}/jalons`}
              className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              <FlagOutlined style={{ fontSize: 16 }} />
              Poser un jalon
            </Link>
          </div>
        ) : null}

        <Link
          href={`/projects/${projectId}/members`}
          className="flex items-center justify-between gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
        >
          <span className="inline-flex items-center gap-2 text-body-sm font-medium">
            <GroupOutlined style={{ fontSize: 17 }} />
            Membres
          </span>
          <ChevronRightOutlined style={{ fontSize: 18 }} />
        </Link>

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

function SaveIndicator({ state }: { state: EtatSauvegarde }) {
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
