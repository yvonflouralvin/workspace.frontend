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
  type VisitePage,
  createVisite,
  listVisites,
  leaveVisite,
  orientVisite,
} from "@/app/lib/visites-api";
import {
  type OverviewEntry,
  type QueueEntry,
  getQueuesOverview,
  triageVisite,
} from "@/app/lib/reception-api";
import { listPatients, listServices, type PatientSummary, type Service } from "@/app/lib/api";
import { ApiError } from "@/app/lib/api";
import {
  AddOutlined,
  MedicalServicesOutlined,
  RefreshOutlined,
  SearchOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<VisitePriority, { badge: string; dot: string; border: string }> = {
  CRITIQUE:    { badge: "bg-error text-on-error",                        dot: "bg-error",       border: "border-error/50" },
  TRES_URGENT: { badge: "bg-orange-500 text-white",                      dot: "bg-orange-500",  border: "border-orange-300" },
  URGENT:      { badge: "bg-yellow-500 text-yellow-900",                 dot: "bg-yellow-500",  border: "border-yellow-300" },
  NORMAL:      { badge: "bg-surface-container text-on-surface-variant",  dot: "bg-secondary",   border: "border-outline-variant" },
};

const STATUS_CONFIG: Record<VisiteStatus, { badge: string }> = {
  ARRIVE:          { badge: "bg-blue-100 text-blue-700" },
  EN_ATTENTE:      { badge: "bg-yellow-100 text-yellow-800" },
  EN_CONSULTATION: { badge: "bg-green-100 text-green-800" },
  TERMINE:         { badge: "bg-surface-container text-on-surface-variant" },
  PARTI:           { badge: "bg-surface-container text-on-surface-variant" },
};

const PRIORITIES: VisitePriority[] = ["NORMAL", "URGENT", "TRES_URGENT", "CRITIQUE"];
const ALL_STATUSES: VisiteStatus[] = ["ARRIVE", "EN_ATTENTE", "EN_CONSULTATION", "TERMINE", "PARTI"];
const ACTIVE_STATUSES: VisiteStatus[] = ["ARRIVE", "EN_ATTENTE", "EN_CONSULTATION"];

const POLL_INTERVAL_MS = 30_000;
const PER_PAGE = 20;

type ActiveTab = "visites" | "services";

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

function waitMinutes(arrivedAt: string): number {
  return Math.floor((Date.now() - new Date(arrivedAt).getTime()) / 60_000);
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ReceptionPage() {
  const { can } = usePermissions();
  const canView   = can("hosto.reception.view");
  const canManage = can("hosto.reception.manage");
  const canTriage = can("hosto.appointments.triage");

  const [activeTab, setActiveTab] = useState<ActiveTab>("visites");

  // ── Visites tab state ──────────────────────────────────────────────────────
  const [visitePage, setVisitePage]   = useState<VisitePage | null>(null);
  const [visiteSearch, setVisiteSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisiteStatus[]>(ACTIVE_STATUSES);
  const [serviceFilter, setServiceFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [loadingVisites, setLoadingVisites] = useState(true);

  // ── Services tab state ─────────────────────────────────────────────────────
  const [overview, setOverview]       = useState<OverviewEntry[]>([]);
  const [svcSearch, setSvcSearch]     = useState("");
  const [loadingOverview, setLoadingOverview] = useState(true);

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [services, setServices]       = useState<Service[]>([]);
  const [error, setError]             = useState<string | null>(null);

  // ── Registration drawer ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [patientId, setPatientId]     = useState<number | null>(null);
  const [serviceId, setServiceId]     = useState<number | null>(null);
  const [priority, setPriority]       = useState<VisitePriority>("NORMAL");
  const [reason, setReason]           = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // ── Triage modal ───────────────────────────────────────────────────────────
  const [triageTarget, setTriageTarget]     = useState<{ id: number; priority: VisitePriority; triage_note: string | null; patient: { prenom: string; nom: string } } | null>(null);
  const [triagePriority, setTriagePriority] = useState<VisitePriority>("NORMAL");
  const [triageNote, setTriageNote]         = useState("");
  const [triageSubmitting, setTriageSubmitting] = useState(false);

  // ── Orient modal ───────────────────────────────────────────────────────────
  const [orientTarget, setOrientTarget]   = useState<{ id: number; service_id: number | null; patient: { prenom: string; nom: string } } | null>(null);
  const [orientSvcId, setOrientSvcId]     = useState<number | null>(null);
  const [orientSubmitting, setOrientSubmitting] = useState(false);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const [leavingId, setLeavingId]     = useState<number | null>(null);

  const pollTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Chargement visites ─────────────────────────────────────────────────────
  const loadVisites = useCallback(async (pg: number, silent = false) => {
    if (!canView) { setLoadingVisites(false); return; }
    if (!silent) setLoadingVisites(true);
    try {
      const data = await listVisites({
        status: statusFilter.length > 0 ? statusFilter : ALL_STATUSES,
        service_id: serviceFilter ?? undefined,
        q: debouncedSearch || undefined,
        page: pg,
        per_page: PER_PAGE,
      });
      setVisitePage(data);
    } catch {
      if (!silent) setError("Impossible de charger les visites.");
    } finally {
      setLoadingVisites(false);
    }
  }, [canView, statusFilter, serviceFilter, debouncedSearch]);

  // ── Chargement overview ────────────────────────────────────────────────────
  const loadOverview = useCallback(async (silent = false) => {
    if (!canView) { setLoadingOverview(false); return; }
    if (!silent) setLoadingOverview(true);
    try {
      const data = await getQueuesOverview();
      setOverview(data);
    } catch {
      if (!silent) setError("Impossible de charger la vue d'ensemble.");
    } finally {
      setLoadingOverview(false);
    }
  }, [canView]);

  // ── Polling ────────────────────────────────────────────────────────────────
  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(() => {
      loadVisites(currentPage, true);
      loadOverview(true);
      schedulePoll();
    }, POLL_INTERVAL_MS);
  }, [loadVisites, loadOverview, currentPage]);

  useEffect(() => {
    listServices().then(setServices).catch(() => {});
    loadOverview();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1);
    loadVisites(1);
  }, [statusFilter, serviceFilter, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadVisites(currentPage);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    schedulePoll();
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [schedulePoll]);

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(visiteSearch);
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [visiteSearch]);

  function handleRefresh() {
    loadVisites(currentPage);
    loadOverview();
  }

  // ── Status filter toggle ───────────────────────────────────────────────────
  function toggleStatus(s: VisiteStatus) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  // ── Registration drawer ────────────────────────────────────────────────────
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
      loadVisites(currentPage);
      loadOverview(true);
    } catch (err) {
      setFormError(err instanceof ApiError && err.status === 409 ? err.message : "Impossible d'enregistrer l'arrivée.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Triage ─────────────────────────────────────────────────────────────────
  function openTriage(v: Visite | QueueEntry) {
    setTriageTarget({ id: v.id, priority: v.priority, triage_note: v.triage_note, patient: v.patient });
    setTriagePriority(v.priority);
    setTriageNote(v.triage_note ?? "");
  }

  async function handleTriage(e: React.FormEvent) {
    e.preventDefault();
    if (!triageTarget) return;
    setTriageSubmitting(true);
    try {
      await triageVisite(triageTarget.id, triagePriority, triageNote.trim() || undefined);
      setTriageTarget(null);
      loadVisites(currentPage, true);
      loadOverview(true);
    } catch { /* keep modal open for retry */ }
    finally { setTriageSubmitting(false); }
  }

  // ── Orient ─────────────────────────────────────────────────────────────────
  function openOrient(v: Visite | QueueEntry) {
    setOrientTarget({ id: v.id, service_id: v.service_id, patient: v.patient });
    setOrientSvcId(null);
  }

  async function handleOrient(e: React.FormEvent) {
    e.preventDefault();
    if (!orientTarget || !orientSvcId) return;
    setOrientSubmitting(true);
    try {
      await orientVisite(orientTarget.id, orientSvcId);
      setOrientTarget(null);
      loadVisites(currentPage, true);
      loadOverview(true);
    } catch { /* keep modal open for retry */ }
    finally { setOrientSubmitting(false); }
  }

  // ── Leave ──────────────────────────────────────────────────────────────────
  async function handleLeave(id: number) {
    setLeavingId(id);
    try {
      await leaveVisite(id);
      loadVisites(currentPage, true);
      loadOverview(true);
    } catch { /* no-op */ }
    finally { setLeavingId(null); }
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
  const filteredOverview = overview.filter((e) =>
    svcSearch
      ? e.service.nom.toLowerCase().includes(svcSearch.toLowerCase()) ||
        e.service.code.toLowerCase().includes(svcSearch.toLowerCase())
      : true,
  );

  return (
    <DashboardShell>
      <div className="p-6 max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface">Réception</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {totalWaiting} patient{totalWaiting !== 1 ? "s" : ""} en attente · {overview.length} service{overview.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Rafraîchir"
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
              <RefreshOutlined style={{ fontSize: 20 }} />
            </button>
            {canManage && (
              <button
                onClick={openDrawer}
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

        {/* Tabs */}
        <div className="flex gap-1 border-b border-outline-variant">
          {(["visites", "services"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}>
              {tab === "visites" ? "Liste des visites" : "Services"}
              {tab === "visites" && visitePage && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-label-xs bg-surface-container text-on-surface-variant tabular-nums">
                  {visitePage.total}
                </span>
              )}
              {tab === "services" && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-label-xs bg-surface-container text-on-surface-variant tabular-nums">
                  {overview.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Liste des visites ───────────────────────────────────────── */}
        {activeTab === "visites" && (
          <div className="space-y-4">

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-start">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <SearchOutlined
                  style={{ fontSize: 18 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={visiteSearch}
                  onChange={(e) => setVisiteSearch(e.target.value)}
                  placeholder="Nom, dossier…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-body-md text-on-surface focus:outline-none focus:border-primary" />
              </div>

              {/* Status chips */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-2.5 py-1 rounded-full text-label-sm font-medium transition-colors border ${
                      statusFilter.includes(s)
                        ? `${STATUS_CONFIG[s].badge} border-current`
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                    }`}>
                    {VISITE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>

              {/* Service dropdown */}
              <select
                value={serviceFilter ?? ""}
                onChange={(e) => setServiceFilter(e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary">
                <option value="">Tous les services</option>
                {services.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            {loadingVisites ? (
              <p className="text-body-sm text-on-surface-variant py-4">Chargement…</p>
            ) : !visitePage || visitePage.items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <MedicalServicesOutlined style={{ fontSize: 40 }} className="text-outline" />
                <p className="text-body-md text-on-surface-variant">Aucune visite trouvée.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-outline-variant">
                <table className="w-full text-body-sm text-on-surface">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container/50">
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Patient</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Statut</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Priorité</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Service</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Arrivée</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Attente</th>
                      <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {visitePage.items.map((v) => {
                      const pcfg = PRIORITY_CONFIG[v.priority];
                      const isActive = ACTIVE_STATUSES.includes(v.status);
                      const mins = isActive ? waitMinutes(v.arrived_at) : null;
                      return (
                        <tr key={v.id} className="bg-surface hover:bg-surface-container/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-on-surface">
                              {v.patient.prenom} {v.patient.nom}
                            </div>
                            <div className="text-label-sm text-on-surface-variant">{v.patient.dossier_number}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-label-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[v.status].badge}`}>
                              {VISITE_STATUS_LABELS[v.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-label-xs px-2 py-0.5 rounded-full font-semibold ${pcfg.badge}`}>
                              {VISITE_PRIORITY_LABELS[v.priority]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {v.service?.nom ?? <span className="italic text-on-surface-variant/60">—</span>}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-on-surface-variant">
                            {formatTime(v.arrived_at)}
                          </td>
                          <td className="px-4 py-3">
                            {mins !== null ? <WaitBadge minutes={mins} /> : <span className="text-on-surface-variant/50">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 justify-end flex-wrap">
                              <button
                                disabled
                                title="Disponible en C3"
                                className="px-2.5 py-1 rounded-lg text-label-sm border border-primary/30 text-primary/40 cursor-not-allowed whitespace-nowrap">
                                Prendre en charge
                              </button>
                              {canTriage && isActive && (
                                <button
                                  onClick={() => openTriage(v)}
                                  className="px-2.5 py-1 rounded-lg text-label-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors whitespace-nowrap">
                                  Triage
                                </button>
                              )}
                              {canManage && isActive && (
                                <>
                                  <button
                                    onClick={() => openOrient(v)}
                                    className="px-2.5 py-1 rounded-lg text-label-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors whitespace-nowrap">
                                    Réorienter
                                  </button>
                                  <button
                                    onClick={() => handleLeave(v.id)}
                                    disabled={leavingId === v.id}
                                    className="px-2.5 py-1 rounded-lg text-label-sm border border-error/30 text-error hover:bg-error/5 transition-colors disabled:opacity-40 whitespace-nowrap">
                                    {leavingId === v.id ? "…" : "Parti"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {visitePage && visitePage.pages > 1 && (
              <div className="flex items-center justify-between gap-4 pt-1">
                <p className="text-body-sm text-on-surface-variant">
                  Page {visitePage.page} / {visitePage.pages} · {visitePage.total} visite{visitePage.total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                    ←
                  </button>
                  {Array.from({ length: visitePage.pages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === visitePage.pages)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-on-surface-variant text-body-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`px-3 py-1.5 rounded-xl text-body-sm transition-colors ${
                            currentPage === p
                              ? "bg-primary text-on-primary"
                              : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                          }`}>
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(visitePage.pages, p + 1))}
                    disabled={currentPage === visitePage.pages}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Services ────────────────────────────────────────────────── */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-xs">
              <SearchOutlined
                style={{ fontSize: 18 }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={svcSearch}
                onChange={(e) => setSvcSearch(e.target.value)}
                placeholder="Nom ou code…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-body-md text-on-surface focus:outline-none focus:border-primary" />
            </div>

            {loadingOverview ? (
              <p className="text-body-sm text-on-surface-variant py-4">Chargement…</p>
            ) : filteredOverview.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <MedicalServicesOutlined style={{ fontSize: 40 }} className="text-outline" />
                <p className="text-body-md text-on-surface-variant">
                  {svcSearch ? "Aucun service correspondant." : "Aucun service actif."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOverview.map((entry) => (
                  <ServiceCard key={entry.service.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Drawer enregistrement arrivée ───────────────────────────────────── */}
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
              <label className="text-label-md text-on-surface-variant font-medium">Service d&apos;orientation</label>
              <select
                value={serviceId ?? ""}
                onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
                <option value="">Non orienté pour l&apos;instant</option>
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

      {/* ── Modal triage ────────────────────────────────────────────────────── */}
      {triageTarget && (
        <RightDrawer
          title={`Triage — ${triageTarget.patient.prenom} ${triageTarget.patient.nom}`}
          onClose={() => setTriageTarget(null)}
          width="w-[440px] max-w-full">
          <form onSubmit={handleTriage} className="space-y-5">
            <p className="text-body-sm text-on-surface-variant">
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

      {/* ── Modal orientation ────────────────────────────────────────────────── */}
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

// ─── Service Card (tab Services) ──────────────────────────────────────────────

function ServiceCard({ entry }: { entry: OverviewEntry }) {
  const { service, waiting_count, next_patient } = entry;
  const isTriage = service.queue_mode === "TRIAGE";

  return (
    <div className="p-4 rounded-2xl border border-outline-variant bg-surface space-y-3">
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
            <span className="text-body-sm text-on-surface-variant tabular-nums">
              {next_patient.wait_minutes} min
            </span>
          </div>
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant italic px-1">File vide</p>
      )}
    </div>
  );
}
