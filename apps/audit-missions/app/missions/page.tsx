"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listMissions,
  createMission,
  searchTiers,
  STATUT_MISSION_LABELS,
  type MissionSummary,
  type StatutMission,
  type TiersBrief,
} from "@/lib/audit-api";
import { AddOutlined, WorkOutlineOutlined, WarningAmberOutlined } from "@mui/icons-material";

const STATUT_TONE: Record<StatutMission, string> = {
  PREPARATION: "bg-surface-container text-on-surface-variant",
  EN_COURS: "bg-role-admin-container text-role-admin",
  CLOTUREE: "bg-member-active-container text-member-active",
};

export default function MissionsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("audit_missions.missions.manage");

  const [missions, setMissions] = useState<MissionSummary[] | null>(null);
  const [creating, setCreating] = useState(false);

  function reload() {
    listMissions().then(setMissions);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Missions d&rsquo;audit</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Checklists de contrôle, équipe, anomalies et rapports.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouvelle mission
            </button>
          )}
        </div>

        {missions === null && <p className="text-body-md text-on-surface-variant">Chargement…</p>}

        {missions !== null && missions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-outline-soft p-10 text-center">
            <WorkOutlineOutlined style={{ fontSize: 32 }} className="text-outline mx-auto" />
            <p className="text-body-md text-on-surface-variant mt-2">Aucune mission d&rsquo;audit pour l&rsquo;instant.</p>
          </div>
        )}

        {missions !== null && missions.length > 0 && (
          <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            {missions.map((m) => {
              const pct = m.controles_total > 0 ? Math.round((m.controles_valides / m.controles_total) * 100) : 0;
              return (
                <li key={m.id}>
                  <Link
                    href={`/missions/${m.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-body-md font-medium text-on-surface truncate">{m.nom}</p>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUT_TONE[m.statut]}`}>
                          {STATUT_MISSION_LABELS[m.statut]}
                        </span>
                      </div>
                      <p className="text-label-md text-outline mt-0.5">
                        <span className="font-mono">{m.code}</span>
                        {m.periode_debut && ` · ${m.periode_debut} → ${m.periode_fin ?? "…"}`}
                      </p>
                    </div>
                    {m.controles_total > 0 && (
                      <div className="hidden sm:flex items-center gap-2 w-40 shrink-0">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                          <div className="h-full bg-secondary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-label-md text-outline w-14 text-right">
                          {m.controles_valides}/{m.controles_total}
                        </span>
                      </div>
                    )}
                    {m.anomalies_ouvertes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-error-container px-2 py-1 text-[11px] font-semibold text-error shrink-0">
                        <WarningAmberOutlined style={{ fontSize: 14 }} />
                        {m.anomalies_ouvertes}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {creating && (
          <NouvelleMissionDrawer
            onClose={() => setCreating(false)}
            onCreated={(m) => router.push(`/missions/${m.id}`)}
          />
        )}
      </div>
    </DashboardShell>
  );
}

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

function NouvelleMissionDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (m: { id: number }) => void;
}) {
  const [nom, setNom] = useState("");
  const [typeAudit, setTypeAudit] = useState("");
  const [tiersId, setTiersId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const m = await createMission({
        nom: nom.trim(),
        type_audit: typeAudit || undefined,
        tiers_id: tiersId ?? undefined,
      });
      onCreated(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer
      title="Nouvelle mission d'audit"
      onClose={onClose}
      width="md:w-[440px] md:max-w-[92vw]"
      footer={
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="nouvelle-mission-form"
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {saving ? "Création…" : "Créer"}
          </button>
        </div>
      }
    >
      <form id="nouvelle-mission-form" onSubmit={submit} className="space-y-4">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <div>
          <span className={LABEL}>Nom de la mission</span>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className={FIELD}
            autoFocus
            required
          />
        </div>
        <div>
          <span className={LABEL}>Type d&rsquo;audit</span>
          <input
            type="text"
            value={typeAudit}
            onChange={(e) => setTypeAudit(e.target.value)}
            className={FIELD}
            placeholder="Ex. Audit financier, audit fiscal…"
          />
        </div>
        <div>
          <span className={LABEL}>Client (facultatif)</span>
          <SearchSelect<TiersBrief>
            value={tiersId}
            onChange={(v) => setTiersId(v === null ? null : Number(v))}
            fetchOptions={searchTiers}
            getOptionLabel={(t) => t.nom}
            getOptionValue={(t) => t.id}
            placeholder="Rechercher un client…"
          />
        </div>
      </form>
    </RightDrawer>
  );
}
