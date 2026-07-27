"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@repo/ui/Avatar";
import { projectsApi, type ProjectActivity } from "@/app/lib/projects-api";
import { useProject } from "../project-context";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Regroupe par jour : un flux d'activité se lit par journées, pas ligne à ligne. */
function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ProjectActivityPage() {
  const { projectId, role } = useProject();
  const [rows, setRows] = useState<ProjectActivity[] | null>(null);

  useEffect(() => {
    projectsApi
      .listActivities(projectId, 100)
      .then(setRows)
      .catch(() => setRows([]));
  }, [projectId]);

  const days = (rows ?? []).reduce<Record<string, ProjectActivity[]>>((acc, row) => {
    const key = dayKey(row.created_at);
    (acc[key] ??= []).push(row);
    return acc;
  }, {});

  return (
    <div className="max-w-[820px] space-y-5">
      <div>
        <h2 className="font-display text-headline-sm text-on-surface">Activité du projet</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Ce qui s&apos;est passé dans ce projet — phases, tâches, livrables, membres.
          {role === "VIEWER" && " Vous ne voyez que ce qui relève de votre périmètre."}
        </p>
      </div>

      {rows === null && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}
      {rows?.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">
          Aucune activité enregistrée pour l&apos;instant.
        </p>
      )}

      {Object.entries(days).map(([day, entries]) => (
        <div key={day}>
          <p className="text-label-sm uppercase text-outline mb-2 first-letter:uppercase">{day}</p>
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            {entries.map((row) => (
              <div
                key={row.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-hairline last:border-b-0"
              >
                <span className="flex-none mt-0.5">
                  <Avatar name={row.actor_name ?? "?"} size={26} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-body-sm text-on-surface">
                    <strong className="font-semibold">{row.actor_name ?? "Quelqu'un"}</strong>{" "}
                    {row.action_label ?? row.action}
                    {row.target_label && (
                      <>
                        {" "}
                        <span className="font-medium">« {row.target_label} »</span>
                      </>
                    )}
                    {row.detail && <span className="text-on-surface-variant"> — {row.detail}</span>}
                  </span>
                </span>
                <span className="flex-none text-label-md text-outline whitespace-nowrap">
                  {fmt(row.created_at).split(" ").slice(-1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
