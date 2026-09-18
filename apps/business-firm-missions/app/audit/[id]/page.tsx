"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, type TabItem } from "@repo/ui/Tabs";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getMissionAudit,
  updateMissionAudit,
  STATUT_MISSION_LABELS,
  type MissionAudit,
  type StatutMissionAudit,
} from "@/lib/bfm-audit-api";
import {
  EquipePanel,
  EtapesPanel,
  DocumentsDemandesPanel,
  ChecklistPanel,
  RisquesPanel,
  AnomaliesPanel,
  RapportsPanel,
  HistoriquePanel,
} from "./Panels";
import { ArrowBackOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function MissionAuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<MissionAudit | null>(null);

  function reload() { getMissionAudit(Number(id)).then(setMission); }
  useEffect(reload, [id]);

  async function changerStatut(statut: StatutMissionAudit) {
    await updateMissionAudit(Number(id), { statut });
    reload();
  }

  if (!mission) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-on-surface-variant">Chargement…</p></div>
      </DashboardShell>
    );
  }

  const tabs: TabItem[] = [
    { key: "checklist", label: "Checklist", content: <ChecklistPanel missionId={mission.id} /> },
    { key: "documents", label: "Documents demandés", content: <DocumentsDemandesPanel missionId={mission.id} /> },
    { key: "etapes", label: "Planning", content: <EtapesPanel missionId={mission.id} /> },
    { key: "risques", label: "Risques", content: <RisquesPanel missionId={mission.id} /> },
    { key: "anomalies", label: "Anomalies", content: <AnomaliesPanel missionId={mission.id} /> },
    { key: "equipe", label: "Équipe", content: <EquipePanel missionId={mission.id} /> },
    { key: "rapports", label: "Rapports", content: <RapportsPanel missionId={mission.id} /> },
    { key: "historique", label: "Historique", content: <HistoriquePanel missionId={mission.id} /> },
  ];

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/audit" className="text-outline hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-headline-lg text-on-surface font-mono">{mission.code}</h1>
            <p className="text-body-sm text-on-surface-variant">{mission.nom} {mission.type_audit ? `· ${mission.type_audit}` : ""}</p>
          </div>
          <select className={FIELD} value={mission.statut} onChange={(e) => changerStatut(e.target.value as StatutMissionAudit)}>
            {Object.entries(STATUT_MISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {mission.objectifs && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className="text-label-sm uppercase text-outline mb-1">Objectifs</p>
            <p className="text-body-sm text-on-surface">{mission.objectifs}</p>
          </div>
        )}

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
          <Tabs tabs={tabs} />
        </div>
      </div>
    </DashboardShell>
  );
}
