"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowBackOutlined, HistoryOutlined, TuneOutlined } from "@mui/icons-material";
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_TONES,
  projectsApi,
  type Deliverable,
  type DeliverableApprovers,
} from "@/app/lib/projects-api";
import { useProject } from "../../project-context";
import { DeliverableProvider } from "./deliverable-context";

export default function DeliverableLayout({ children }: { children: ReactNode }) {
  const { deliverableId } = useParams<{ deliverableId: string }>();
  const pathname = usePathname();
  const { projectId, project, phases, canManage } = useProject();

  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [title, setTitle] = useState("");
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [approvers, setApprovers] = useState<DeliverableApprovers | null>(null);
  const [loading, setLoading] = useState(true);

  const id = Number(deliverableId);
  const reload = useCallback(async () => {
    const [row, app] = await Promise.all([
      projectsApi.getDeliverable(id),
      projectsApi.getApprovers(id).catch(() => null),
    ]);
    setDeliverable(row);
    setTitle(row.title);
    setApprovers(app);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => setDeliverable(null))
      .finally(() => setLoading(false));
  }, [reload]);

  if (loading) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }
  if (!deliverable) {
    return (
      <div className="space-y-4">
        <Back projectId={projectId} />
        <p className="text-body-md text-error">Livrable introuvable.</p>
      </div>
    );
  }

  const phase = phases.find((p) => p.id === deliverable.phase_id) ?? null;
  const base = `/projects/${projectId}/deliverables/${deliverable.id}`;
  const sections = [
    { key: "overview", href: base, label: "Aperçu", icon: <HistoryOutlined style={{ fontSize: 17 }} /> },
    {
      key: "settings",
      href: `${base}/settings`,
      label: "Configuration",
      icon: <TuneOutlined style={{ fontSize: 17 }} />,
    },
  ];
  const tone = DELIVERABLE_STATUS_TONES[deliverable.status] ?? DELIVERABLE_STATUS_TONES.A_PRODUIRE!;

  return (
    <div>
      <Back projectId={projectId} phaseId={deliverable.phase_id} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-label-md font-medium text-outline">
            <Link href={`/projects/${projectId}`} className="truncate hover:text-primary transition-colors">
              {project.name}
            </Link>
            {phase && (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={`/projects/${projectId}/phases/${phase.id}`}
                  className="truncate hover:text-primary transition-colors"
                >
                  {phase.name}
                </Link>
              </>
            )}
            {deliverable.task_title && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{deliverable.task_title}</span>
              </>
            )}
          </span>
          {canManage ? (
            <input
              aria-label="Intitulé du livrable"
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (titleTimer.current) clearTimeout(titleTimer.current);
                if (!next.trim()) return;
                titleTimer.current = setTimeout(() => {
                  void projectsApi.updateDeliverable(deliverable.id, { title: next.trim() });
                }, 800);
              }}
              placeholder="Intitulé du livrable"
              className="mt-0.5 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
            />
          ) : (
            <h1 className="mt-0.5 font-display text-headline-md text-on-surface truncate">
              {deliverable.title}
            </h1>
          )}
        </div>

        <span
          className={`flex-none mt-4 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}
        >
          <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
          {DELIVERABLE_STATUS_LABELS[deliverable.status] ?? deliverable.status}
        </span>
      </div>

      <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
        {sections.map((section) => {
          const active = pathname === section.href;
          return (
            <Link
              key={section.key}
              href={section.href}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {section.icon}
              {section.label}
            </Link>
          );
        })}
      </nav>

      <DeliverableProvider value={{ deliverable, phase, approvers, reload, canManage }}>
        {children}
      </DeliverableProvider>
    </div>
  );
}

function Back({ projectId, phaseId }: { projectId: number; phaseId?: number }) {
  return (
    <Link
      href={phaseId ? `/projects/${projectId}/phases/${phaseId}/deliverables` : `/projects/${projectId}`}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Livrables
    </Link>
  );
}
