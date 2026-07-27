"use client";

import Link from "next/link";
import { AccountTreeOutlined, ViewListOutlined } from "@mui/icons-material";
import {
  DELIVERABLE_STATUS_LABELS,
  DELIVERABLE_STATUS_TONES,
  DELIVERABLE_TYPE_LABELS,
} from "@/app/lib/projects-api";
import { useProject } from "../project-context";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectDeliverablesPage() {
  const { projectId, deliverables, phases } = useProject();

  // Groupé par phase : un livrable se lit dans le segment qui le produit.
  const byPhase = phases
    .map((phase) => ({
      phase,
      rows: deliverables.filter((d) => d.phase_id === phase.id),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <div className="max-w-[820px] space-y-5">
      <div>
        <h2 className="font-display text-headline-sm text-on-surface">Livrables du projet</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Tout ce que le projet doit produire, phases et tâches confondues. Un livrable
          s&apos;ajoute depuis sa phase — c&apos;est elle qui décide de ce à quoi il se rattache.
        </p>
      </div>

      {deliverables.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">Aucun livrable dans ce projet.</p>
      )}

      {byPhase.map(({ phase, rows }) => (
        <div key={phase.id}>
          <Link
            href={`/projects/${projectId}/phases/${phase.id}/deliverables`}
            className="inline-flex items-center gap-1.5 mb-2 text-label-sm uppercase text-outline hover:text-primary transition-colors"
          >
            <AccountTreeOutlined style={{ fontSize: 15 }} />
            {phase.name}
          </Link>
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            {rows.map((row) => {
              const tone = DELIVERABLE_STATUS_TONES[row.status] ?? DELIVERABLE_STATUS_TONES.A_PRODUIRE!;
              return (
                <Link
                  key={row.id}
                  href={`/projects/${projectId}/deliverables/${row.id}`}
                  className="flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-1.5 px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors group"
                >
                  <span className="w-full md:flex-1 min-w-0">
                    <span className="block text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                      {row.title}
                    </span>
                    <span className="flex items-center gap-1.5 text-label-md text-outline truncate">
                      {row.task_title && (
                        <>
                          <ViewListOutlined style={{ fontSize: 13 }} />
                          {row.task_title}
                          <span aria-hidden>·</span>
                        </>
                      )}
                      {DELIVERABLE_TYPE_LABELS[row.expected_type]}
                    </span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}
                  >
                    <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
                    {DELIVERABLE_STATUS_LABELS[row.status] ?? row.status}
                  </span>

                  <span className="w-[100px] flex-none text-label-md text-on-surface-variant">
                    {fmt(row.due_date)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
