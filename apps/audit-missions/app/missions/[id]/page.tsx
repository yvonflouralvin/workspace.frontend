"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Tabs } from "@repo/ui/Tabs";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getMission,
  updateMission,
  listMembers,
  getTiersBrief,
  STATUT_MISSION_LABELS,
  type MissionDetail,
  type StatutMission,
  type WorkspaceMember,
} from "@/lib/audit-api";
import { ChecklistPanel } from "./ChecklistPanel";
import { AnomaliesPanel } from "./AnomaliesPanel";
import { EquipePanel } from "./EquipePanel";
import { ArrowBackOutlined } from "@mui/icons-material";

const STATUT_TONE: Record<StatutMission, string> = {
  PREPARATION: "bg-surface-container text-on-surface-variant",
  EN_COURS: "bg-role-admin-container text-role-admin",
  CLOTUREE: "bg-member-active-container text-member-active",
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const { can } = usePermissions();
  const canManage = can("audit_missions.missions.manage");
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [tiersNom, setTiersNom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getMission(missionId)
      .then(setMission)
      .catch(() => setError("Mission introuvable."));
  }, [missionId]);

  useEffect(() => {
    if (mission?.tiers_id) {
      getTiersBrief(mission.tiers_id).then((t) => setTiersNom(t?.nom ?? null));
    } else {
      setTiersNom(null);
    }
  }, [mission?.tiers_id]);

  useEffect(() => {
    if (workspaceId) listMembers(workspaceId).then(setMembers);
  }, [workspaceId]);

  async function changerStatutMission(statut: StatutMission) {
    if (!mission) return;
    try {
      const updated = await updateMission(mission.id, { statut });
      setMission(updated);
      setToast("Statut mis à jour.");
    } catch {
      setToast("Impossible de changer le statut.");
    }
  }

  function memberName(userId: number | null): string {
    if (!userId) return "—";
    const m = members.find((mb) => mb.user.id === userId);
    return m ? m.user.username || m.user.email : `#${userId}`;
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 text-body-md text-error">{error}</div>
      </DashboardShell>
    );
  }
  if (!mission) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
        <Link
          href="/missions"
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Missions
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-headline-md text-on-surface">{mission.nom}</h1>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUT_TONE[mission.statut]}`}>
                {STATUT_MISSION_LABELS[mission.statut]}
              </span>
            </div>
            <p className="text-label-md text-outline mt-0.5">
              <span className="font-mono">{mission.code}</span>
              {mission.type_audit && ` · ${mission.type_audit}`}
              {mission.tiers_id && ` · Client ${tiersNom ?? `#${mission.tiers_id}`}`}
              {` · Responsable ${memberName(mission.responsable_user_id)}`}
            </p>
          </div>
          {canManage && (
            <select
              value={mission.statut}
              onChange={(e) => changerStatutMission(e.target.value as StatutMission)}
              className="h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 text-body-sm text-on-surface outline-none focus:border-primary"
            >
              {Object.entries(STATUT_MISSION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
        </div>

        {mission.objectifs && (
          <p className="text-body-sm text-on-surface-variant mb-5 whitespace-pre-wrap">{mission.objectifs}</p>
        )}

        <Tabs
          tabs={[
            {
              key: "checklist",
              label: "Checklist",
              content: (
                <ChecklistPanel
                  missionId={mission.id}
                  canManage={canManage}
                  members={members}
                  onToast={setToast}
                />
              ),
            },
            {
              key: "anomalies",
              label: "Anomalies",
              content: <AnomaliesPanel missionId={mission.id} canManage={canManage} onToast={setToast} />,
            },
            {
              key: "equipe",
              label: "Équipe",
              content: (
                <EquipePanel
                  missionId={mission.id}
                  canManage={canManage}
                  members={members}
                  onToast={setToast}
                />
              ),
            },
          ]}
        />

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
