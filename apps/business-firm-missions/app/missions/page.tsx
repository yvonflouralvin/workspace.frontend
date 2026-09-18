"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { listMissions, type Mission } from "@/lib/projects-api";
import { AddOutlined, OpenInNewOutlined } from "@mui/icons-material";

const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005";

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[] | null>(null);

  useEffect(() => {
    listMissions().then(setMissions);
  }, []);

  const columns = useMemo<DataListColumn<Mission>[]>(
    () => [
      { key: "name", header: "Nom", render: (m) => m.name },
      { key: "type", header: "Type de mission", render: (m) => m.type_mission ?? "—" },
      { key: "departement", header: "Département", render: (m) => m.departement ?? "—" },
      { key: "status", header: "Statut", render: (m) => m.status },
      { key: "budget", header: "Budget", render: (m) => m.budget ? m.budget.toLocaleString("fr-FR") : "—" },
      { key: "avancement", header: "Tâches", render: (m) => `${m.done_count ?? 0}/${m.task_count ?? 0}` },
      {
        key: "actions",
        header: "",
        render: (m) => (
          <a
            href={`${WORKSPACE_DOMAIN}/projects/${m.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ouvrir <OpenInNewOutlined style={{ fontSize: 14 }} />
          </a>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Missions</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Dossiers et missions génériques — le suivi détaillé (tâches, sous-tâches, jalons) se fait dans l&rsquo;app Workspace.
            </p>
          </div>
          <Link
            href="/missions/nouvelle"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouvelle mission
          </Link>
        </div>

        {missions === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <DataList
            items={missions}
            columns={columns}
            getRowKey={(m) => m.id}
            searchText={(m) => `${m.name} ${m.type_mission ?? ""} ${m.departement ?? ""}`}
            searchPlaceholder="Rechercher une mission…"
            pageSize={20}
            emptyMessage="Aucune mission."
          />
        )}
      </div>
    </DashboardShell>
  );
}
