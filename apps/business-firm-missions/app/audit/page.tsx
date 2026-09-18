"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { listMissionsAudit, STATUT_MISSION_LABELS, type MissionAuditSummary } from "@/lib/bfm-audit-api";
import { AddOutlined } from "@mui/icons-material";

export default function AuditPage() {
  const [missions, setMissions] = useState<MissionAuditSummary[] | null>(null);

  useEffect(() => {
    listMissionsAudit().then(setMissions);
  }, []);

  const columns = useMemo<DataListColumn<MissionAuditSummary>[]>(
    () => [
      { key: "code", header: "Code", render: (m) => <span className="font-mono">{m.code}</span> },
      { key: "nom", header: "Nom", render: (m) => m.nom },
      {
        key: "statut",
        header: "Statut",
        render: (m) => (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold bg-surface-container text-on-surface-variant">
            {STATUT_MISSION_LABELS[m.statut]}
          </span>
        ),
      },
      { key: "controles", header: "Checklist", render: (m) => `${m.controles_valides}/${m.controles_total}` },
      { key: "anomalies", header: "Anomalies ouvertes", render: (m) => m.anomalies_ouvertes },
      { key: "risques", header: "Risques ouverts", render: (m) => m.risques_ouverts },
    ],
    [],
  );

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Audit</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Missions d&rsquo;audit — checklists, risques, anomalies, rapports.
            </p>
          </div>
          <Link
            href="/audit/nouvelle"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouvelle mission d&rsquo;audit
          </Link>
        </div>

        {missions === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <DataList
            items={missions}
            columns={columns}
            getRowKey={(m) => m.id}
            searchText={(m) => `${m.code} ${m.nom}`}
            searchPlaceholder="Rechercher une mission…"
            pageSize={20}
            emptyMessage="Aucune mission d'audit."
            onRowClick={(m) => { window.location.href = `/audit/${m.id}`; }}
          />
        )}
      </div>
    </DashboardShell>
  );
}
