"use client";

import { useEffect, useState, useCallback } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listAppointments, listServices, updateAppointment,
  type Appointment, type Service, type AppointmentStatus, type AppointmentPriority,
  STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS,
} from "@/app/lib/api";
import {
  CalendarMonthOutlined, ChevronLeftOutlined, ChevronRightOutlined,
  FilterListOutlined, RefreshOutlined,
} from "@mui/icons-material";

const PRIORITY_CONFIG: Record<AppointmentPriority, { label: string; cls: string; dot: string }> = {
  CRITIQUE:    { label: "Critique",    cls: "bg-error/10 border-error/30 text-error",              dot: "bg-error" },
  TRES_URGENT: { label: "Très urgent", cls: "bg-orange-50 border-orange-200 text-orange-700",       dot: "bg-orange-500" },
  URGENT:      { label: "Urgent",      cls: "bg-yellow-50 border-yellow-200 text-yellow-700",       dot: "bg-yellow-500" },
  NORMAL:      { label: "Normal",      cls: "bg-surface-container border-outline-variant text-on-surface-variant", dot: "bg-secondary" },
};

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; cls: string }> = {
  EN_ATTENTE: { label: "En attente", cls: "bg-secondary/10 text-secondary" },
  EN_COURS:   { label: "En cours",   cls: "bg-primary/10 text-primary" },
  TERMINE:    { label: "Terminé",    cls: "bg-surface-container text-on-surface-variant" },
  ANNULE:     { label: "Annulé",     cls: "bg-error/10 text-error" },
};

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  EN_ATTENTE: "EN_COURS",
  EN_COURS:   "TERMINE",
};

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendarPage() {
  const { can } = usePermissions();
  const canView   = can("hosto.appointments.view");
  const canManage = can("hosto.appointments.manage");

  const [day, setDay]           = useState(() => toDateStr(new Date()));
  const [services, setServices] = useState<Service[]>([]);
  const [filterSvc, setFilterSvc]   = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [advancing, setAdvancing] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof listAppointments>[0] = { day };
      if (filterSvc) params.service_id = Number(filterSvc);
      if (filterStatus) params.status = filterStatus;
      setAppointments(await listAppointments(params));
    } catch {
      setError("Impossible de charger le calendrier.");
    } finally {
      setLoading(false);
    }
  }, [canView, day, filterSvc, filterStatus]);

  useEffect(() => {
    listServices().then(setServices).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function shiftDay(n: number) {
    const d = new Date(day);
    d.setDate(d.getDate() + n);
    setDay(toDateStr(d));
  }

  async function advanceStatus(appt: Appointment) {
    const next = NEXT_STATUS[appt.status];
    if (!next || !canManage) return;
    setAdvancing(appt.id);
    try {
      const updated = await updateAppointment(appt.id, { status: next });
      setAppointments((a) => a.map((x) => (x.id === appt.id ? updated : x)));
    } catch {}
    setAdvancing(null);
  }

  const dayLabel = new Date(day + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const grouped = appointments.reduce<Record<AppointmentPriority, Appointment[]>>(
    (acc, a) => { acc[a.priority].push(a); return acc; },
    { CRITIQUE: [], TRES_URGENT: [], URGENT: [], NORMAL: [] },
  );

  const priorityGroups: AppointmentPriority[] = ["CRITIQUE", "TRES_URGENT", "URGENT", "NORMAL"];
  const noAppointments = appointments.length === 0;

  return (
    <DashboardShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface">Calendrier / Triage</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {appointments.length} rendez-vous · {dayLabel}
            </p>
          </div>
          <button onClick={load} title="Rafraîchir"
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
            <RefreshOutlined style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Day nav + filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
            <button onClick={() => shiftDay(-1)}
              className="px-2 py-2 hover:bg-surface-container transition-colors">
              <ChevronLeftOutlined style={{ fontSize: 18 }} />
            </button>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
              className="px-2 py-1.5 text-body-md text-on-surface bg-transparent focus:outline-none" />
            <button onClick={() => shiftDay(1)}
              className="px-2 py-2 hover:bg-surface-container transition-colors">
              <ChevronRightOutlined style={{ fontSize: 18 }} />
            </button>
          </div>

          <button onClick={() => setDay(toDateStr(new Date()))}
            className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
            Aujourd'hui
          </button>

          <FilterListOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />

          <select value={filterSvc} onChange={(e) => setFilterSvc(e.target.value)}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface-variant focus:outline-none">
            <option value="">Tous les services</option>
            {services.map((s) => <option key={s.id} value={String(s.id)}>{s.nom}</option>)}
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface-variant focus:outline-none">
            <option value="">Tous les statuts</option>
            {(["EN_ATTENTE", "EN_COURS", "TERMINE", "ANNULE"] as AppointmentStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {!loading && noAppointments && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarMonthOutlined style={{ fontSize: 40 }} className="text-outline" />
            <p className="text-body-md text-on-surface-variant">Aucun rendez-vous pour ce jour.</p>
          </div>
        )}

        {/* Priority groups */}
        {!loading && !noAppointments && priorityGroups.map((priority) => {
          const items = grouped[priority];
          if (items.length === 0) return null;
          const cfg = PRIORITY_CONFIG[priority];
          return (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <h2 className="text-body-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  {cfg.label} — {items.length}
                </h2>
              </div>
              <div className="space-y-2">
                {items.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    priorityCfg={cfg}
                    canManage={canManage}
                    advancing={advancing === appt.id}
                    onAdvance={() => advanceStatus(appt)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}

function AppointmentCard({
  appt, priorityCfg, canManage, advancing, onAdvance,
}: {
  appt: Appointment;
  priorityCfg: { label: string; cls: string; dot: string };
  canManage: boolean;
  advancing: boolean;
  onAdvance: () => void;
}) {
  const statusCfg  = STATUS_CONFIG[appt.status];
  const nextStatus = NEXT_STATUS[appt.status];
  const nextLabel  = nextStatus ? STATUS_LABELS[nextStatus] : null;

  const patientName = `${appt.patient.prenom} ${appt.patient.nom}`;

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border ${priorityCfg.cls}`}>
      {/* Time */}
      <div className="w-14 text-center shrink-0">
        <span className="text-body-md font-semibold tabular-nums">{formatTime(appt.scheduled_at)}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body-md font-semibold text-on-surface">{patientName}</span>
          <span className="text-label-sm text-on-surface-variant">#{appt.patient.dossier_number}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-body-sm text-on-surface-variant">
          <span>{TYPE_LABELS[appt.type]}</span>
          {appt.service && <span>· {appt.service.nom}</span>}
          {appt.staff && <span>· Dr {appt.staff.nom_cache}</span>}
          {appt.motif && <span className="truncate max-w-xs">· {appt.motif}</span>}
        </div>
      </div>

      {/* Status + action */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-label-sm px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
        {canManage && nextLabel && (
          <button
            onClick={onAdvance}
            disabled={advancing}
            className="px-3 py-1.5 rounded-lg text-label-sm border border-current/30 hover:bg-white/60 transition-colors disabled:opacity-40 whitespace-nowrap">
            → {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
