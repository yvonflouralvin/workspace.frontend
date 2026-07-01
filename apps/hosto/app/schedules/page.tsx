"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listServices, listSchedules, listStaff, createSchedule, updateSchedule,
  deleteSchedule, addStaffToSchedule, removeStaffFromSchedule,
  type Service, type ServiceSchedule, type HostoStaff, type ScheduleCreateInput,
  ROLE_LABELS,
} from "@/app/lib/api";
import {
  AddOutlined, CalendarMonthOutlined, CalendarViewDayOutlined, CalendarViewWeekOutlined,
  CloseOutlined, DeleteOutlined, EditOutlined, PersonAddOutlined,
  ScheduleOutlined, SearchOutlined, WarningAmberOutlined,
} from "@mui/icons-material";

const DAYS      = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

function fmt(t: string) { return t.slice(0, 5); }

// ─── Staff picker dropdown ────────────────────────────────────────────────────

function StaffPicker({
  allStaff,
  alreadyIn,
  onAdd,
  adding,
}: {
  allStaff: HostoStaff[];
  alreadyIn: number[];
  onAdd: (s: HostoStaff) => void;
  adding: boolean;
}) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState("");
  const ref               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function out(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  const available = allStaff
    .filter((s) => s.active && !alreadyIn.includes(s.id))
    .filter((s) =>
      !q ||
      s.nom_cache.toLowerCase().includes(q.toLowerCase()) ||
      s.prenom_cache.toLowerCase().includes(q.toLowerCase())
    );

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={adding}
        onClick={() => { setOpen((o) => !o); setQ(""); }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/40 text-primary text-label-sm hover:bg-primary/5 transition-colors disabled:opacity-40"
      >
        <PersonAddOutlined style={{ fontSize: 13 }} />
        Ajouter
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-64 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden">
          <div className="p-2 border-b border-outline-variant">
            <div className="relative">
              <SearchOutlined style={{ fontSize: 14 }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-7 pr-3 py-1.5 text-body-sm rounded-lg border border-outline-variant focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {available.length === 0 && (
              <p className="px-4 py-3 text-body-sm text-on-surface-variant">Aucun personnel disponible.</p>
            )}
            {available.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onAdd(s); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 text-secondary text-label-sm font-semibold select-none">
                  {s.prenom_cache[0]}{s.nom_cache[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-on-surface truncate">
                    {s.prenom_cache} {s.nom_cache}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">{ROLE_LABELS[s.role]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Slot form ────────────────────────────────────────────────────────────────

function SlotForm({
  initial,
  dayOfWeek,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial?: { open_time: string; close_time: string; max_slots: number | null; label: string | null };
  dayOfWeek: number;
  onSave: (data: Omit<ScheduleCreateInput, "service_id" | "day_of_week">) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [openTime, setOpenTime]   = useState(initial ? fmt(initial.open_time) : "08:00");
  const [closeTime, setCloseTime] = useState(initial ? fmt(initial.close_time) : "12:00");
  const [maxSlots, setMaxSlots]   = useState(initial?.max_slots != null ? String(initial.max_slots) : "");
  const [label, setLabel]         = useState(initial?.label ?? "");

  return (
    <div className="space-y-5">
      <p className="text-body-sm text-on-surface-variant">
        Jour : <strong className="text-on-surface">{DAYS[dayOfWeek]}</strong>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-medium text-on-surface-variant">Ouverture <span className="text-error">*</span></label>
          <input type="time" className={inputCls} value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-medium text-on-surface-variant">Fermeture <span className="text-error">*</span></label>
          <input type="time" className={inputCls} value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Capacité max</label>
        <input type="number" min={1} className={inputCls} value={maxSlots}
          onChange={(e) => setMaxSlots(e.target.value)} placeholder="Illimitée" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Libellé (optionnel)</label>
        <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex : Consultations du matin" />
      </div>
      {error && <p className="text-body-sm text-error">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={saving}
          onClick={() => onSave({
            open_time: openTime + ":00",
            close_time: closeTime + ":00",
            max_slots: maxSlots ? Number(maxSlots) : undefined,
            label: label || undefined,
          })}
          className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
          Annuler
        </button>
      </div>
    </div>
  );
}

// ─── Weekly table cell ────────────────────────────────────────────────────────

function DayCell({
  slots, canManage, onAdd, onEdit, onDelete,
}: {
  slots: ServiceSchedule[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (s: ServiceSchedule) => void;
  onDelete: (s: ServiceSchedule) => void;
}) {
  return (
    <td className="align-top border border-outline-variant px-2 py-2 min-w-[100px]">
      <div className="flex flex-col gap-1">
        {slots.map((slot) => (
          <div key={slot.id} className="group relative rounded-lg bg-primary/8 border border-primary/15 px-2 py-1.5">
            <p className="text-label-sm font-semibold text-primary tabular-nums leading-none">
              {fmt(slot.open_time)} – {fmt(slot.close_time)}
            </p>
            {slot.label && (
              <p className="text-label-sm text-on-surface-variant truncate mt-0.5" title={slot.label}>{slot.label}</p>
            )}
            {slot.staff.length > 0 && (
              <p className="text-label-sm text-secondary mt-0.5">{slot.staff.length} pers.</p>
            )}
            {canManage && (
              <div className="absolute inset-0 rounded-lg bg-surface-container-lowest/92 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button onClick={() => onEdit(slot)} className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors">
                  <EditOutlined style={{ fontSize: 14 }} />
                </button>
                <button onClick={() => onDelete(slot)} className="p-1 rounded text-on-surface-variant hover:text-error transition-colors">
                  <DeleteOutlined style={{ fontSize: 14 }} />
                </button>
              </div>
            )}
          </div>
        ))}
        {canManage && (
          <button onClick={onAdd}
            className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-outline-variant hover:border-primary hover:text-primary text-on-surface-variant/60 transition-colors py-1 text-label-sm">
            <AddOutlined style={{ fontSize: 13 }} />
            Ajouter
          </button>
        )}
      </div>
    </td>
  );
}

// ─── Daily view ───────────────────────────────────────────────────────────────

function DailyView({
  services,
  schedules,
  allStaff,
  canManage,
  onEdit,
  onDelete,
  onAdd,
  onAddStaff,
  onRemoveStaff,
}: {
  services: Service[];
  schedules: ServiceSchedule[];
  allStaff: HostoStaff[];
  canManage: boolean;
  onEdit: (s: ServiceSchedule) => void;
  onDelete: (s: ServiceSchedule) => void;
  onAdd: (serviceId: number, day: number) => void;
  onAddStaff: (schedule: ServiceSchedule, staff: HostoStaff) => void;
  onRemoveStaff: (schedule: ServiceSchedule, staffId: number) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // JS: 0=Dim → 6, 1=Lun → 0, …
  });
  const [addingStaff, setAddingStaff] = useState<number | null>(null); // schedule id

  const daySchedules = schedules.filter((s) => s.active && s.day_of_week === selectedDay);
  const serviceIds   = [...new Set(daySchedules.map((s) => s.service_id))];
  const openServices = services.filter((s) => serviceIds.includes(s.id));

  async function handleAddStaff(schedule: ServiceSchedule, staff: HostoStaff) {
    setAddingStaff(schedule.id);
    await onAddStaff(schedule, staff);
    setAddingStaff(null);
  }

  return (
    <div className="space-y-5">
      {/* Day selector */}
      <div className="flex gap-1 flex-wrap">
        {DAYS.map((day, i) => {
          const count = schedules.filter((s) => s.active && s.day_of_week === i).length;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`flex flex-col items-center px-4 py-2 rounded-xl text-body-sm font-medium transition-colors ${
                selectedDay === i
                  ? "bg-primary text-on-primary"
                  : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span>{DAYS_SHORT[i]}</span>
              {count > 0 && (
                <span className={`text-label-sm mt-0.5 ${selectedDay === i ? "text-on-primary/70" : "text-primary"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day content */}
      <div>
        <h2 className="text-body-md font-semibold text-on-surface mb-3">
          {DAYS[selectedDay]}
          <span className="ml-2 text-body-sm font-normal text-on-surface-variant">
            — {openServices.length > 0
              ? `${openServices.length} service${openServices.length > 1 ? "s" : ""} ouvert${openServices.length > 1 ? "s" : ""}`
              : "aucun service"}
          </span>
        </h2>

        {openServices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant py-12 text-center">
            <p className="text-body-md text-on-surface-variant">Aucun service ne reçoit ce jour-là.</p>
            {canManage && (
              <p className="text-body-sm text-on-surface-variant mt-1">
                Passez en vue hebdomadaire pour ajouter des créneaux.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {openServices.map((svc) => {
              const svcSlots = daySchedules
                .filter((s) => s.service_id === svc.id)
                .sort((a, b) => a.open_time.localeCompare(b.open_time));
              return (
                <div key={svc.id} className="rounded-2xl border border-outline-variant overflow-hidden">
                  {/* Service header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-surface-container/40 border-b border-outline-variant">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-md font-semibold text-on-surface">{svc.nom}</span>
                        <span className="text-label-sm font-mono text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container">
                          {svc.code}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <button onClick={() => onAdd(svc.id, selectedDay)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                        <AddOutlined style={{ fontSize: 13 }} />
                        Créneau
                      </button>
                    )}
                  </div>

                  {/* Slots */}
                  <div className="divide-y divide-outline-variant">
                    {svcSlots.map((slot) => (
                      <div key={slot.id} className="px-4 py-3 space-y-2">
                        {/* Slot header */}
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/8 border border-primary/15 text-body-sm font-semibold text-primary tabular-nums">
                              <ScheduleOutlined style={{ fontSize: 14 }} />
                              {fmt(slot.open_time)} – {fmt(slot.close_time)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            {slot.label && (
                              <p className="text-body-sm text-on-surface-variant">{slot.label}</p>
                            )}
                            {slot.max_slots != null && (
                              <p className="text-label-sm text-on-surface-variant">
                                Capacité : {slot.max_slots} rendez-vous max
                              </p>
                            )}
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => onEdit(slot)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors">
                                <EditOutlined style={{ fontSize: 15 }} />
                              </button>
                              <button onClick={() => onDelete(slot)}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors">
                                <DeleteOutlined style={{ fontSize: 15 }} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Staff */}
                        <div className="pl-1">
                          <p className="text-label-md font-medium text-on-surface-variant mb-1.5">
                            Personnel assigné
                          </p>
                          <div className="flex flex-wrap gap-2 items-center">
                            {slot.staff.length === 0 && (
                              <span className="text-label-sm text-on-surface-variant/60 italic">
                                Aucun personnel assigné
                              </span>
                            )}
                            {slot.staff.map((member) => (
                              <div key={member.id}
                                className="group flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-full border border-outline-variant bg-surface-container-lowest text-body-sm">
                                <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-label-sm font-semibold select-none shrink-0">
                                  {member.prenom_cache[0]}{member.nom_cache[0]}
                                </div>
                                <span className="text-on-surface">
                                  {member.prenom_cache} {member.nom_cache}
                                </span>
                                <span className="text-on-surface-variant text-label-sm">
                                  · {ROLE_LABELS[member.role]}
                                </span>
                                {canManage && (
                                  <button
                                    onClick={() => onRemoveStaff(slot, member.id)}
                                    className="ml-0.5 opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all rounded-full"
                                    title="Retirer"
                                  >
                                    <CloseOutlined style={{ fontSize: 13 }} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {canManage && (
                              <StaffPicker
                                allStaff={allStaff}
                                alreadyIn={slot.staff.map((s) => s.id)}
                                onAdd={(staff) => handleAddStaff(slot, staff)}
                                adding={addingStaff === slot.id}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const { can }   = usePermissions();
  const canView   = can("hosto.schedules.view");
  const canManage = can("hosto.schedules.manage");

  const [services, setServices]   = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [allStaff, setAllStaff]   = useState<HostoStaff[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [view, setView] = useState<"weekly" | "daily">("weekly");

  // Drawer
  type DrawerMode =
    | { type: "create"; serviceId: number; day: number; serviceName: string }
    | { type: "edit"; schedule: ServiceSchedule; serviceName: string }
    | null;

  const [drawer, setDrawer]             = useState<DrawerMode>(null);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerError, setDrawerError]   = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ServiceSchedule | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    Promise.all([listServices(), listSchedules(), listStaff({ active: true, page_size: 100 })])
      .then(([svcs, scheds, staffPage]) => {
        setServices(svcs);
        setSchedules(scheds);
        setAllStaff(staffPage.items);
      })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, [canView]);

  function svcName(id: number) { return services.find((s) => s.id === id)?.nom ?? ""; }

  function openAdd(serviceId: number, day: number) {
    setDrawer({ type: "create", serviceId, day, serviceName: svcName(serviceId) });
    setDrawerError(null);
  }
  function openEdit(schedule: ServiceSchedule) {
    setDrawer({ type: "edit", schedule, serviceName: svcName(schedule.service_id) });
    setDrawerError(null);
  }
  function closeDrawer() { setDrawer(null); setDrawerError(null); }

  async function handleSaveCreate(data: Omit<ScheduleCreateInput, "service_id" | "day_of_week">) {
    if (drawer?.type !== "create") return;
    setDrawerSaving(true); setDrawerError(null);
    try {
      const created = await createSchedule({ service_id: drawer.serviceId, day_of_week: drawer.day, ...data });
      setSchedules((s) => [...s, created]);
      closeDrawer();
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally { setDrawerSaving(false); }
  }

  async function handleSaveEdit(data: Omit<ScheduleCreateInput, "service_id" | "day_of_week">) {
    if (drawer?.type !== "edit") return;
    setDrawerSaving(true); setDrawerError(null);
    try {
      const updated = await updateSchedule(drawer.schedule.id, data);
      setSchedules((s) => s.map((x) => (x.id === updated.id ? updated : x)));
      closeDrawer();
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Erreur lors de la modification.");
    } finally { setDrawerSaving(false); }
  }

  async function handleDelete(schedule: ServiceSchedule) {
    try {
      await deleteSchedule(schedule.id);
      setSchedules((s) => s.filter((x) => x.id !== schedule.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer.");
    }
  }

  const handleAddStaff = useCallback(async (schedule: ServiceSchedule, staff: HostoStaff) => {
    try {
      const updated = await addStaffToSchedule(schedule.id, staff.id);
      setSchedules((s) => s.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter le personnel.");
    }
  }, []);

  const handleRemoveStaff = useCallback(async (schedule: ServiceSchedule, staffId: number) => {
    try {
      const updated = await removeStaffFromSchedule(schedule.id, staffId);
      setSchedules((s) => s.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer le personnel.");
    }
  }, []);

  const drawerTitle =
    drawer?.type === "create"
      ? `Ajouter un créneau — ${DAYS[drawer.day]}`
      : "Modifier le créneau";

  const activeSchedules = schedules.filter((s) => s.active);

  return (
    <DashboardShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface flex items-center gap-2">
              <ScheduleOutlined style={{ fontSize: 22 }} className="text-primary" />
              Horaires de consultation
            </h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Créneaux d&apos;ouverture et personnel assigné par service.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-xl border border-outline-variant overflow-hidden bg-surface-container-lowest">
              <button
                onClick={() => setView("weekly")}
                className={`flex items-center gap-1.5 px-3 py-2 text-body-sm transition-colors ${
                  view === "weekly" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <CalendarViewWeekOutlined style={{ fontSize: 16 }} />
                Hebdomadaire
              </button>
              <button
                onClick={() => setView("daily")}
                className={`flex items-center gap-1.5 px-3 py-2 text-body-sm transition-colors ${
                  view === "daily" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <CalendarViewDayOutlined style={{ fontSize: 16 }} />
                Journalière
              </button>
            </div>
            <a href="/calendar"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              <CalendarMonthOutlined style={{ fontSize: 16 }} />
              Calendrier
            </a>
          </div>
        </div>

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3">
            <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error shrink-0" />
            <p className="text-body-sm text-on-surface flex-1">
              Supprimer le créneau{" "}
              <strong>{DAYS[deleteTarget.day_of_week]} {fmt(deleteTarget.open_time)}–{fmt(deleteTarget.close_time)}</strong>{" "}
              ({svcName(deleteTarget.service_id)}) ?
            </p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteTarget)}
                className="px-3 py-1.5 rounded-lg text-body-sm bg-error text-white hover:opacity-90">
                Supprimer
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Content */}
        {loading ? (
          <p className="text-body-sm text-on-surface-variant py-8 text-center">Chargement…</p>
        ) : !canView ? (
          <p className="text-body-sm text-on-surface-variant text-center py-12">Vous n&apos;avez pas accès aux horaires.</p>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ScheduleOutlined style={{ fontSize: 40 }} className="text-outline" />
            <p className="text-body-md text-on-surface-variant">Aucun service enregistré.</p>
            <a href="/services" className="text-body-sm text-primary underline">Créer des services</a>
          </div>
        ) : view === "daily" ? (
          <DailyView
            services={services}
            schedules={schedules}
            allStaff={allStaff}
            canManage={canManage}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onAdd={openAdd}
            onAddStaff={handleAddStaff}
            onRemoveStaff={handleRemoveStaff}
          />
        ) : (
          /* Weekly table */
          <div className="overflow-x-auto rounded-2xl border border-outline-variant">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container/50">
                  <th className="text-left px-4 py-3 border border-outline-variant text-body-sm font-semibold text-on-surface-variant min-w-[160px]">
                    Service
                  </th>
                  {DAYS_SHORT.map((day, i) => (
                    <th key={i}
                      className={`text-center px-3 py-3 border border-outline-variant text-body-sm font-semibold min-w-[110px] ${
                        i >= 5 ? "text-on-surface-variant/60" : "text-on-surface-variant"
                      }`}>
                      {day}
                      {i >= 5 && <span className="block text-label-sm font-normal">Week-end</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => {
                  const svcSchedules = activeSchedules.filter((s) => s.service_id === svc.id);
                  return (
                    <tr key={svc.id} className="hover:bg-surface-container/20 transition-colors">
                      <td className="border border-outline-variant px-4 py-3 align-top">
                        <p className="text-body-md font-medium text-on-surface">{svc.nom}</p>
                        <p className="text-label-sm font-mono text-on-surface-variant">{svc.code}</p>
                        {!svc.active && (
                          <span className="text-label-sm px-1.5 py-0.5 rounded bg-error/10 text-error mt-0.5 inline-block">Archivé</span>
                        )}
                      </td>
                      {DAYS.map((_, d) => (
                        <DayCell
                          key={d}
                          slots={svcSchedules.filter((s) => s.day_of_week === d)}
                          canManage={canManage}
                          onAdd={() => openAdd(svc.id, d)}
                          onEdit={openEdit}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawer && (
        <RightDrawer title={drawerTitle} onClose={closeDrawer}>
          <div className="space-y-4">
            <p className="text-body-sm text-on-surface-variant">
              Service : <strong className="text-on-surface">{drawer.serviceName}</strong>
            </p>
            {drawer.type === "create" && (
              <SlotForm
                dayOfWeek={drawer.day}
                onSave={handleSaveCreate}
                onCancel={closeDrawer}
                saving={drawerSaving}
                error={drawerError}
              />
            )}
            {drawer.type === "edit" && (
              <SlotForm
                dayOfWeek={drawer.schedule.day_of_week}
                initial={drawer.schedule}
                onSave={handleSaveEdit}
                onCancel={closeDrawer}
                saving={drawerSaving}
                error={drawerError}
              />
            )}
          </div>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}
