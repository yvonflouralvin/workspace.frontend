"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { listMissions, STATUT_MISSION_LABELS, type MissionSummary } from "@/lib/bfm-missions-api";
import { AddOutlined } from "@mui/icons-material";

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionSummary[] | null>(null);

  useEffect(() => {
    listMissions().then(setMissions);
  }, []);

  const columns = useMemo<DataListColumn<MissionSummary>[]>(
    () => [
      { key: "code", header: "Code", render: (m) => <span className="font-mono">{m.code}</span> },
      { key: "nom", header: "Nom", render: (m) => m.nom },
      { key: "type", header: "Type de mission", render: (m) => m.type_mission ?? "—" },
      { key: "departement", header: "Département", render: (m) => m.departement ?? "—" },
      {
        key: "statut",
        header: "Statut",
        render: (m) => (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold bg-surface-container text-on-surface-variant">
            {STATUT_MISSION_LABELS[m.statut]}
          </span>
        ),
      },
      { key: "budget", header: "Budget", render: (m) => m.budget ? m.budget.toLocaleString("fr-FR") : "—" },
      { key: "avancement", header: "Tâches", render: (m) => `${m.taches_terminees}/${m.taches_total}` },
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
              Dossiers et missions — chacune se découpe en phases, elles-mêmes en tâches.
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
            searchText={(m) => `${m.code} ${m.nom} ${m.type_mission ?? ""} ${m.departement ?? ""}`}
            searchPlaceholder="Rechercher une mission…"
            pageSize={20}
            emptyMessage="Aucune mission."
            onRowClick={(m) => { window.location.href = `/missions/${m.id}`; }}
          />
        )}
      </div>
    </DashboardShell>
  );
}
