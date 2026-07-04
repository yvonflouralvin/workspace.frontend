"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  type Visite,
  type VisiteStatus,
  type VisitePriority,
  VISITE_STATUS_LABELS,
  VISITE_PRIORITY_LABELS,
  createVisite,
  listVisites,
  leaveVisite,
} from "@/app/lib/visites-api";
import { listPatients, listServices, type PatientSummary, type Service } from "@/app/lib/api";
import { ApiError } from "@/app/lib/api";
import {
  AddOutlined,
  HowToRegOutlined,
  RefreshOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

const PRIORITY_CONFIG: Record<VisitePriority, { cls: string; dot: string }> = {
  CRITIQUE:    { cls: "bg-error/10 border-error/30 text-error",                             dot: "bg-error" },
  TRES_URGENT: { cls: "bg-orange-50 border-orange-200 text-orange-700",                     dot: "bg-orange-500" },
  URGENT:      { cls: "bg-yellow-50 border-yellow-200 text-yellow-700",                     dot: "bg-yellow-500" },
  NORMAL:      { cls: "bg-surface-container border-outline-variant text-on-surface-variant", dot: "bg-secondary" },
};

const STATUS_CONFIG: Record<VisiteStatus, { cls: string }> = {
  ARRIVE:          { cls: "bg-primary/10 text-primary" },
  EN_ATTENTE:      { cls: "bg-secondary/10 text-secondary" },
  EN_CONSULTATION: { cls: "bg-tertiary/10 text-tertiary" },
  TERMINE:         { cls: "bg-surface-container text-on-surface-variant" },
  PARTI:           { cls: "bg-error/10 text-error" },
};

const PRIORITIES: VisitePriority[] = ["NORMAL", "URGENT", "TRES_URGENT", "CRITIQUE"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function ReceptionPage() {
  const { can } = usePermissions();
  const canView   = can("hosto.reception.view");
  const canManage = can("hosto.reception.manage");

  const [visites, setVisites]       = useState<Visite[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [patientId, setPatientId]   = useState<number | null>(null);
  const [serviceId, setServiceId]   = useState<number | null>(null);
  const [priority, setPriority]     = useState<VisitePriority>("NORMAL");
  const [reason, setReason]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  const [leavingId, setLeavingId]   = useState<number | null>(null);
  const [services, setServices]     = useState<Service[]>([]);

  const load = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const page = await listVisites();
      setVisites(page.items);
    } catch {
      setError("Impossible de charger les arrivées du jour.");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { listServices().then(setServices).catch(() => {}); }, []);

  function openDrawer() {
    setPatientId(null);
    setServiceId(null);
    setPriority("NORMAL");
    setReason("");
    setFormError(null);
    setDrawerOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setFormError("Veuillez sélectionner un patient."); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const visite = await createVisite({
        patient_id: patientId,
        service_id: serviceId ?? undefined,
        priority,
        reason: reason.trim() || undefined,
      });
      setDrawerOpen(false);
      setVisites((prev) => [visite, ...prev]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError(err.message);
      } else {
        setFormError("Impossible d'enregistrer l'arrivée. Réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave(visite: Visite) {
    setLeavingId(visite.id);
    try {
      const updated = await leaveVisite(visite.id);
      setVisites((prev) => prev.map((v) => (v.id === visite.id ? updated : v)));
    } catch {
      // keep silently — user sees no change, can retry
    } finally {
      setLeavingId(null);
    }
  }

  async function searchPatients(q: string): Promise<PatientSummary[]> {
    const page = await listPatients({ q, pageSize: 10 });
    return page.items;
  }

  const activeVisites = visites.filter((v) => !["TERMINE", "PARTI"].includes(v.status));
  const closedVisites = visites.filter((v) => ["TERMINE", "PARTI"].includes(v.status));

  if (!canView) {
    return (
      <DashboardShell>
        <div className="p-8 text-center text-on-surface-variant">
          Accès non autorisé.
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface">Réception</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {activeVisites.length} arrivée{activeVisites.length !== 1 ? "s" : ""} actives aujourd'hui
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} title="Rafraîchir"
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
              <RefreshOutlined style={{ fontSize: 20 }} />
            </button>
            {canManage && (
              <button onClick={openDrawer}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary/90 transition-colors">
                <AddOutlined style={{ fontSize: 18 }} />
                Enregistrer une arrivée
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {/* Liste active */}
        {!loading && activeVisites.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <HowToRegOutlined style={{ fontSize: 40 }} className="text-outline" />
            <p className="text-body-md text-on-surface-variant">Aucune arrivée active pour le moment.</p>
          </div>
        )}

        {!loading && activeVisites.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
              En cours — {activeVisites.length}
            </h2>
            {activeVisites.map((v) => (
              <VisiteCard
                key={v.id}
                visite={v}
                canManage={canManage}
                leaving={leavingId === v.id}
                onLeave={() => handleLeave(v)}
              />
            ))}
          </div>
        )}

        {!loading && closedVisites.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider">
              Terminées — {closedVisites.length}
            </h2>
            {closedVisites.map((v) => (
              <VisiteCard key={v.id} visite={v} canManage={false} leaving={false} onLeave={() => {}} />
            ))}
          </div>
        )}
      </div>

      {/* Drawer enregistrement arrivée */}
      {drawerOpen && (
        <RightDrawer title="Enregistrer une arrivée" onClose={() => setDrawerOpen(false)} width="w-[480px] max-w-full">
          <form onSubmit={handleSubmit} className="space-y-5">

            {formError && (
              <div className="flex items-start gap-2 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">
                <WarningAmberOutlined style={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">
                Patient <span className="text-error">*</span>
              </label>
              <SearchSelect<PatientSummary>
                fetchOptions={searchPatients}
                value={patientId}
                onChange={(val) => setPatientId(val as number | null)}
                getOptionLabel={(p) => `${p.prenom} ${p.nom} — ${p.dossier_number}`}
                placeholder="Rechercher un patient…"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">
                Service d'orientation
              </label>
              <select
                value={serviceId ?? ""}
                onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
                <option value="">Non orienté pour l'instant</option>
                {services.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              <p className="text-body-sm text-on-surface-variant">
                Si renseigné, le patient entre directement en file d'attente du service.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Priorité</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-body-sm font-medium transition-colors ${
                        priority === p ? cfg.cls + " ring-2 ring-current" : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      {VISITE_PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">
                Motif de venue
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : douleur abdominale, fièvre…"
                maxLength={255}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={submitting || !patientId}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                {submitting ? "Enregistrement…" : "Enregistrer l'arrivée"}
              </button>
            </div>
          </form>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}

function VisiteCard({
  visite, canManage, leaving, onLeave,
}: {
  visite: Visite;
  canManage: boolean;
  leaving: boolean;
  onLeave: () => void;
}) {
  const priorityCfg = PRIORITY_CONFIG[visite.priority];
  const statusCfg   = STATUS_CONFIG[visite.status];
  const patientName = `${visite.patient.prenom} ${visite.patient.nom}`;
  const isActive    = !["TERMINE", "PARTI"].includes(visite.status);

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border ${priorityCfg.cls}`}>
      {/* Heure */}
      <div className="w-14 text-center shrink-0">
        <span className="text-body-md font-semibold tabular-nums">{formatTime(visite.arrived_at)}</span>
      </div>

      {/* Info patient */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body-md font-semibold text-on-surface">{patientName}</span>
          <span className="text-label-sm text-on-surface-variant">#{visite.patient.dossier_number}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-body-sm text-on-surface-variant">
          <span>{VISITE_PRIORITY_LABELS[visite.priority]}</span>
          {visite.service && <span>· {visite.service.nom}</span>}
          {visite.reason && <span className="truncate max-w-[200px]">· {visite.reason}</span>}
        </div>
      </div>

      {/* Statut + action */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-label-sm px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
          {VISITE_STATUS_LABELS[visite.status]}
        </span>
        {canManage && isActive && visite.status !== "EN_CONSULTATION" && (
          <button
            onClick={onLeave}
            disabled={leaving}
            className="px-3 py-1.5 rounded-lg text-label-sm border border-current/30 hover:bg-white/60 transition-colors disabled:opacity-40 whitespace-nowrap">
            {leaving ? "…" : "Parti"}
          </button>
        )}
      </div>
    </div>
  );
}
