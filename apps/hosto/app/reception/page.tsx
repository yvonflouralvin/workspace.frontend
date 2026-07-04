"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  orientVisite,
} from "@/app/lib/visites-api";
import {
  type OverviewEntry,
  type QueueEntry,
  type QueueResponse,
  getQueuesOverview,
  getServiceQueue,
  triageVisite,
} from "@/app/lib/reception-api";
import { listPatients, listServices, type PatientSummary, type Service } from "@/app/lib/api";
import { ApiError } from "@/app/lib/api";
import {
  AddOutlined,
  ArrowBackOutlined,
  HowToRegOutlined,
  MedicalServicesOutlined,
  RefreshOutlined,
  SortOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

// ─── Config priorités ─────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<VisitePriority, { badge: string; dot: string; border: string }> = {
  CRITIQUE:    { badge: "bg-error text-on-error",                         dot: "bg-error",       border: "border-error/50" },
  TRES_URGENT: { badge: "bg-orange-500 text-white",                       dot: "bg-orange-500",  border: "border-orange-300" },
  URGENT:      { badge: "bg-yellow-500 text-yellow-900",                  dot: "bg-yellow-500",  border: "border-yellow-300" },
  NORMAL:      { badge: "bg-surface-container text-on-surface-variant",   dot: "bg-secondary",   border: "border-outline-variant" },
};

const PRIORITIES: VisitePriority[] = ["NORMAL", "URGENT", "TRES_URGENT", "CRITIQUE"];

// Polling toutes les 30 s — choix documenté : pas de websocket en C1-C2, la réception
// n'a pas besoin de temps-réel strict. Les mises à jour manuelles (bouton rafraîchir)
// restent disponibles. 30 s est un compromis entre fraîcheur et charge serveur.
const POLL_INTERVAL_MS = 30_000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function WaitBadge({ minutes }: { minutes: number }) {
  const long = minutes >= 30;
  const cls  = long
    ? "text-error font-semibold"
    : minutes >= 15
      ? "text-yellow-600"
      : "text-on-surface-variant";
  const label = minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
  return <span className={`text-body-sm tabular-nums ${cls}`}>{label}{long ? " ⚠" : ""}</span>;
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ReceptionPage() {
  const { can } = usePermissions();
  const canView   = can("hosto.reception.view");
  const canManage = can("hosto.reception.manage");
  const canTriage = can("hosto.appointments.triage");

  const [overview, setOverview]           = useState<OverviewEntry[]>([]);
  const [selectedSvc, setSelectedSvc]     = useState<OverviewEntry | null>(null);
  const [queue, setQueue]                 = useState<QueueResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingQueue, setLoadingQueue]   = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [services, setServices]           = useState<Service[]>([]);

  // Drawer enregistrement arrivée
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [patientId, setPatientId]         = useState<number | null>(null);
  const [serviceId, setServiceId]         = useState<number | null>(null);
  const [priority, setPriority]           = useState<VisitePriority>("NORMAL");
  const [reason, setReason]               = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState<string | null>(null);

  // Triage modal
  const [triageTarget, setTriageTarget]   = useState<QueueEntry | null>(null);
  const [triagePriority, setTriagePriority] = useState<VisitePriority>("NORMAL");
  const [triageNote, setTriageNote]       = useState("");
  const [triageSubmitting, setTriageSubmitting] = useState(false);

  // Orient modal
  const [orientTarget, setOrientTarget]   = useState<QueueEntry | null>(null);
  const [orientSvcId, setOrientSvcId]     = useState<number | null>(null);
  const [orientSubmitting, setOrientSubmitting] = useState(false);

  // Leave
  const [leavingId, setLeavingId]         = useState<number | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement overview (sans reset scroll) ────────────────────────────────
  const loadOverview = useCallback(async (silent = false) => {
    if (!canView) { setLoadingOverview(false); return; }
    if (!silent) setLoadingOverview(true);
    setError(null);
    try {
      const data = await getQueuesOverview();
      setOverview(data);
    } catch {
      if (!silent) setError("Impossible de charger la vue d'ensemble.");
    } finally {
      setLoadingOverview(false);
    }
  }, [canView]);

  // ── Chargement file d'un service ──────────────────────────────────────────
  const loadQueue = useCallback(async (svcId: number, silent = false) => {
    if (!silent) setLoadingQueue(true);
    try {
      const q = await getServiceQueue(svcId);
      setQueue(q);
    } catch {
      if (!silent) setQueue(null);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  // ── Polling 30 s ───────────────────────────────────────────────────────────
  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(() => {
      loadOverview(true);
      if (selectedSvc) loadQueue(selectedSvc.service.id, true);
      schedulePoll();
    }, POLL_INTERVAL_MS);
  }, [loadOverview, loadQueue, selectedSvc]);

  useEffect(() => {
    loadOverview();
    listServices().then(setServices).catch(() => {});
    schedulePoll();
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    schedulePoll();
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [schedulePoll]);

  function selectService(entry: OverviewEntry) {
    setSelectedSvc(entry);
    loadQueue(entry.service.id);
  }

  function backToOverview() {
    setSelectedSvc(null);
    setQueue(null);
  }

  // ── Formulaire enregistrement ──────────────────────────────────────────────
  function openDrawer() {
    setPatientId(null); setServiceId(null);
    setPriority("NORMAL"); setReason(""); setFormError(null);
    setDrawerOpen(true);
  }

  async function handleSubmitArrivee(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setFormError("Veuillez sélectionner un patient."); return; }
    setSubmitting(true); setFormError(null);
    try {
      await createVisite({ patient_id: patientId, service_id: serviceId ?? undefined, priority, reason: reason.trim() || undefined });
      setDrawerOpen(false);
      loadOverview();
      if (selectedSvc) loadQueue(selectedSvc.service.id);
    } catch (err) {
      setFormError(err instanceof ApiError && err.status === 409 ? err.message : "Impossible d'enregistrer l'arrivée.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Triage ─────────────────────────────────────────────────────────────────
  function openTriage(entry: QueueEntry) {
    setTriageTarget(entry);
    setTriagePriority(entry.priority);
    setTriageNote(entry.triage_note ?? "");
  }

  async function handleTriage(e: React.FormEvent) {
    e.preventDefault();
    if (!triageTarget) return;
    setTriageSubmitting(true);
    try {
      await triageVisite(triageTarget.id, triagePriority, triageNote.trim() || undefined);
      setTriageTarget(null);
      if (selectedSvc) loadQueue(selectedSvc.service.id, true);
      loadOverview(true);
    } catch {
      // silently keep modal open for retry
    } finally {
      setTriageSubmitting(false);
    }
  }

  // ── Orient ─────────────────────────────────────────────────────────────────
  function openOrient(entry: QueueEntry) {
    setOrientTarget(entry);
    setOrientSvcId(null);
  }

  async function handleOrient(e: React.FormEvent) {
    e.preventDefault();
    if (!orientTarget || !orientSvcId) return;
    setOrientSubmitting(true);
    try {
      await orientVisite(orientTarget.id, orientSvcId);
      setOrientTarget(null);
      if (selectedSvc) loadQueue(selectedSvc.service.id, true);
      loadOverview(true);
    } catch {
      // silently keep modal open for retry
    } finally {
      setOrientSubmitting(false);
    }
  }

  // ── Leave ──────────────────────────────────────────────────────────────────
  async function handleLeave(entry: QueueEntry) {
    setLeavingId(entry.id);
    try {
      await leaveVisite(entry.id);
      if (selectedSvc) loadQueue(selectedSvc.service.id, true);
      loadOverview(true);
    } catch {
      // no-op
    } finally {
      setLeavingId(null);
    }
  }

  async function searchPatients(q: string): Promise<PatientSummary[]> {
    const page = await listPatients({ q, pageSize: 10 });
    return page.items;
  }

  if (!canView) {
    return (
      <DashboardShell>
        <div className="p-8 text-center text-on-surface-variant">Accès non autorisé.</div>
      </DashboardShell>
    );
  }

  const totalWaiting = overview.reduce((n, e) => n + e.waiting_count, 0);

  return (
    <DashboardShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {selectedSvc && (
              <button onClick={backToOverview}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                <ArrowBackOutlined style={{ fontSize: 20 }} />
              </button>
            )}
            <div>
              <h1 className="text-headline-sm font-display text-on-surface">
                {selectedSvc ? selectedSvc.service.nom : "Réception"}
              </h1>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                {selectedSvc
                  ? `${queue?.total ?? 0} patient${(queue?.total ?? 0) !== 1 ? "s" : ""} en attente · ${selectedSvc.service.queue_mode === "TRIAGE" ? "Tri par gravité" : "File d'arrivée"}`
                  : `${totalWaiting} patient${totalWaiting !== 1 ? "s" : ""} en attente · ${overview.length} service${overview.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadOverview(); if (selectedSvc) loadQueue(selectedSvc.service.id); }}
              title="Rafraîchir"
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

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {/* Vue d'ensemble multi-services */}
        {!selectedSvc && (
          <OverviewPanel
            overview={overview}
            loading={loadingOverview}
            onSelectService={selectService}
          />
        )}

        {/* File d'un service */}
        {selectedSvc && (
          <QueuePanel
            queue={queue}
            loading={loadingQueue}
            canManage={canManage}
            canTriage={canTriage}
            leavingId={leavingId}
            onTriage={openTriage}
            onOrient={openOrient}
            onLeave={handleLeave}
          />
        )}
      </div>

      {/* Drawer enregistrement arrivée */}
      {drawerOpen && (
        <RightDrawer title="Enregistrer une arrivée" onClose={() => setDrawerOpen(false)} width="w-[480px] max-w-full">
          <form onSubmit={handleSubmitArrivee} className="space-y-5">
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
              <label className="text-label-md text-on-surface-variant font-medium">Service d'orientation</label>
              <select
                value={serviceId ?? ""}
                onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
                <option value="">Non orienté pour l'instant</option>
                {services.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Priorité</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-body-sm font-medium transition-colors ${
                        priority === p
                          ? `${cfg.badge} ${cfg.border} ring-2 ring-offset-1 ring-current`
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      {VISITE_PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Motif de venue</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : douleur abdominale, fièvre…" maxLength={255}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary" />
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

      {/* Modal triage */}
      {triageTarget && (
        <RightDrawer
          title={`Triage — ${triageTarget.patient.prenom} ${triageTarget.patient.nom}`}
          onClose={() => setTriageTarget(null)}
          width="w-[440px] max-w-full">
          <form onSubmit={handleTriage} className="space-y-5">
            <p className="text-body-sm text-on-surface-variant">
              Définissez le niveau de priorité pour ce patient.
              Priorité actuelle : <span className="font-medium">{VISITE_PRIORITY_LABELS[triageTarget.priority]}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Priorité</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button key={p} type="button" onClick={() => setTriagePriority(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-body-sm font-medium transition-colors ${
                        triagePriority === p
                          ? `${cfg.badge} ${cfg.border} ring-2 ring-offset-1 ring-current`
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      {VISITE_PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Note de triage</label>
              <textarea value={triageNote} onChange={(e) => setTriageNote(e.target.value)}
                rows={3} placeholder="Observations du triage…"
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setTriageTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={triageSubmitting}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                {triageSubmitting ? "Enregistrement…" : "Confirmer le triage"}
              </button>
            </div>
          </form>
        </RightDrawer>
      )}

      {/* Modal orientation */}
      {orientTarget && (
        <RightDrawer
          title={`Orienter — ${orientTarget.patient.prenom} ${orientTarget.patient.nom}`}
          onClose={() => setOrientTarget(null)}
          width="w-[380px] max-w-full">
          <form onSubmit={handleOrient} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">
                Service de destination <span className="text-error">*</span>
              </label>
              <select value={orientSvcId ?? ""}
                onChange={(e) => setOrientSvcId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
                <option value="">— choisir un service —</option>
                {services.filter((s) => s.active && s.id !== orientTarget.service_id).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOrientTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={orientSubmitting || !orientSvcId}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                {orientSubmitting ? "Réorientation…" : "Confirmer"}
              </button>
            </div>
          </form>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}

// ─── Overview Panel ───────────────────────────────────────────────────────────

function OverviewPanel({
  overview,
  loading,
  onSelectService,
}: {
  overview: OverviewEntry[];
  loading: boolean;
  onSelectService: (e: OverviewEntry) => void;
}) {
  if (loading) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  if (overview.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <HowToRegOutlined style={{ fontSize: 40 }} className="text-outline" />
        <p className="text-body-md text-on-surface-variant">Aucun service actif.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {overview.map((entry) => (
        <ServiceCard key={entry.service.id} entry={entry} onClick={() => onSelectService(entry)} />
      ))}
    </div>
  );
}

function ServiceCard({ entry, onClick }: { entry: OverviewEntry; onClick: () => void }) {
  const { service, waiting_count, next_patient } = entry;
  const isTriage = service.queue_mode === "TRIAGE";

  return (
    <button onClick={onClick}
      className="text-left p-4 rounded-2xl border border-outline-variant bg-surface hover:bg-surface-container transition-colors space-y-3 group">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-body-md font-semibold text-on-surface">{service.nom}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isTriage && (
              <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-error/10 text-error font-medium">
                Triage
              </span>
            )}
            <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
              {service.code}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-headline-xs font-bold ${waiting_count > 0 ? "text-primary" : "text-on-surface-variant"}`}>
            {waiting_count}
          </span>
          <p className="text-label-xs text-on-surface-variant">en attente</p>
        </div>
      </div>

      {next_patient ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/50">
          <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_CONFIG[next_patient.priority].dot}`} />
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-on-surface truncate">
              {next_patient.patient.prenom} {next_patient.patient.nom}
            </p>
            <WaitBadge minutes={next_patient.wait_minutes} />
          </div>
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant italic px-1">File vide</p>
      )}
    </button>
  );
}

// ─── Queue Panel ──────────────────────────────────────────────────────────────

function QueuePanel({
  queue,
  loading,
  canManage,
  canTriage,
  leavingId,
  onTriage,
  onOrient,
  onLeave,
}: {
  queue: QueueResponse | null;
  loading: boolean;
  canManage: boolean;
  canTriage: boolean;
  leavingId: number | null;
  onTriage: (e: QueueEntry) => void;
  onOrient: (e: QueueEntry) => void;
  onLeave: (e: QueueEntry) => void;
}) {
  if (loading) return <p className="text-body-sm text-on-surface-variant">Chargement de la file…</p>;
  if (!queue) return null;

  if (queue.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <MedicalServicesOutlined style={{ fontSize: 40 }} className="text-outline" />
        <p className="text-body-md text-on-surface-variant">File d'attente vide pour ce service.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queue.queue_mode === "TRIAGE" && (
        <div className="flex items-center gap-2 mb-1 text-body-sm text-on-surface-variant">
          <SortOutlined style={{ fontSize: 16 }} />
          Trié par gravité — patients les plus critiques en premier
        </div>
      )}
      {queue.items.map((entry, idx) => (
        <QueueRow
          key={entry.id}
          entry={entry}
          position={idx + 1}
          isTriage={queue.queue_mode === "TRIAGE"}
          canManage={canManage}
          canTriage={canTriage}
          leaving={leavingId === entry.id}
          onTriage={() => onTriage(entry)}
          onOrient={() => onOrient(entry)}
          onLeave={() => onLeave(entry)}
        />
      ))}
    </div>
  );
}

function QueueRow({
  entry, position, isTriage, canManage, canTriage, leaving, onTriage, onOrient, onLeave,
}: {
  entry: QueueEntry;
  position: number;
  isTriage: boolean;
  canManage: boolean;
  canTriage: boolean;
  leaving: boolean;
  onTriage: () => void;
  onOrient: () => void;
  onLeave: () => void;
}) {
  const pcfg = PRIORITY_CONFIG[entry.priority];
  const isCritical = entry.priority === "CRITIQUE" || entry.priority === "TRES_URGENT";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isCritical ? pcfg.border : "border-outline-variant"} bg-surface`}>
      {/* Position */}
      <div className="w-7 text-center shrink-0">
        <span className="text-body-sm font-semibold text-on-surface-variant tabular-nums">#{position}</span>
      </div>

      {/* Priorité */}
      <div className="shrink-0">
        <span className={`text-label-xs px-2 py-0.5 rounded-full font-semibold ${pcfg.badge}`}>
          {isTriage ? VISITE_PRIORITY_LABELS[entry.priority] : <span className={`w-2 h-2 rounded-full inline-block ${pcfg.dot}`} />}
        </span>
      </div>

      {/* Info patient */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body-md font-semibold text-on-surface">
            {entry.patient.prenom} {entry.patient.nom}
          </span>
          <span className="text-label-sm text-on-surface-variant">#{entry.patient.dossier_number}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-body-sm text-on-surface-variant">{formatTime(entry.arrived_at)}</span>
          <WaitBadge minutes={entry.wait_minutes} />
          {entry.reason && <span className="text-body-sm text-on-surface-variant truncate max-w-[180px]">· {entry.reason}</span>}
          {entry.triage_note && <span className="text-body-sm text-on-surface-variant italic truncate max-w-[180px]">· {entry.triage_note}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {/* Prendre en charge — bouton stub C3 */}
        <button
          disabled
          title="Disponible en C3 — ouverture de la consultation"
          className="px-3 py-1.5 rounded-lg text-label-sm border border-primary/30 text-primary/40 cursor-not-allowed whitespace-nowrap">
          Prendre en charge
        </button>

        {canTriage && (
          <button onClick={onTriage}
            className="px-2.5 py-1.5 rounded-lg text-label-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors whitespace-nowrap">
            Triage
          </button>
        )}
        {canManage && (
          <>
            <button onClick={onOrient}
              className="px-2.5 py-1.5 rounded-lg text-label-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors whitespace-nowrap">
              Réorienter
            </button>
            <button onClick={onLeave} disabled={leaving}
              className="px-2.5 py-1.5 rounded-lg text-label-sm border border-error/30 text-error hover:bg-error/5 transition-colors disabled:opacity-40 whitespace-nowrap">
              {leaving ? "…" : "Parti"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
