"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listServices, listSchedules, createSchedule, updateSchedule, deleteSchedule,
  type Service, type ServiceSchedule, type ScheduleCreateInput,
} from "@/app/lib/api";
import {
  AccessTimeOutlined, AddOutlined, CalendarMonthOutlined, CloseOutlined,
  DeleteOutlined, EditOutlined, ScheduleOutlined, WarningAmberOutlined,
} from "@mui/icons-material";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

function formatTime(t: string) {
  return t.slice(0, 5); // "08:00:00" → "08:00"
}

// ─── Slot form (used in create + edit drawer) ─────────────────────────────────

function SlotForm({
  initial,
  serviceId,
  dayOfWeek,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial?: { open_time: string; close_time: string; max_slots: number | null; label: string | null };
  serviceId: number;
  dayOfWeek: number;
  onSave: (data: Omit<ScheduleCreateInput, "service_id" | "day_of_week">) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [openTime, setOpenTime]   = useState(initial ? formatTime(initial.open_time) : "08:00");
  const [closeTime, setCloseTime] = useState(initial ? formatTime(initial.close_time) : "12:00");
  const [maxSlots, setMaxSlots]   = useState(initial?.max_slots != null ? String(initial.max_slots) : "");
  const [label, setLabel]         = useState(initial?.label ?? "");

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-on-surface-variant">
        {DAYS[dayOfWeek]}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-medium text-on-surface-variant">Ouverture <span className="text-error">*</span></label>
          <input type="time" className={inputCls} value={openTime}
            onChange={(e) => setOpenTime(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-medium text-on-surface-variant">Fermeture <span className="text-error">*</span></label>
          <input type="time" className={inputCls} value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Capacité max (optionnel)</label>
        <input type="number" min={1} className={inputCls} value={maxSlots}
          onChange={(e) => setMaxSlots(e.target.value)}
          placeholder="Illimitée" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Libellé (optionnel)</label>
        <input className={inputCls} value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex: Consultations du matin" />
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

// ─── Weekly grid for one service ─────────────────────────────────────────────

function ServiceScheduleCard({
  service,
  schedules,
  canManage,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
}: {
  service: Service;
  schedules: ServiceSchedule[];
  canManage: boolean;
  onAddSlot: (serviceId: number, day: number) => void;
  onEditSlot: (schedule: ServiceSchedule) => void;
  onDeleteSlot: (schedule: ServiceSchedule) => void;
}) {
  const byDay = DAYS.map((_, d) => schedules.filter((s) => s.day_of_week === d && s.active));

  const hasAny = schedules.some((s) => s.active);

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      {/* Service header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-outline-variant bg-surface-container/40">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-body-md font-semibold text-on-surface">{service.nom}</span>
            <span className="text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
              {service.code}
            </span>
            {!service.active && (
              <span className="text-label-sm px-2 py-0.5 rounded-full bg-error/10 text-error">Archivé</span>
            )}
          </div>
          {service.description && (
            <p className="text-body-sm text-on-surface-variant mt-0.5 truncate">{service.description}</p>
          )}
        </div>
        {!hasAny && (
          <span className="text-label-sm text-on-surface-variant/60 italic">Aucun horaire défini</span>
        )}
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 divide-x divide-outline-variant">
        {DAYS_SHORT.map((day, d) => {
          const slots = byDay[d];
          return (
            <div key={d} className="flex flex-col min-h-[100px]">
              {/* Day header */}
              <div className={`px-2 py-1.5 text-center border-b border-outline-variant ${d >= 5 ? "bg-surface-container/60" : ""}`}>
                <span className={`text-label-sm font-semibold ${d >= 5 ? "text-on-surface-variant" : "text-on-surface"}`}>
                  {day}
                </span>
              </div>

              {/* Slots */}
              <div className="flex-1 flex flex-col gap-1 p-1.5">
                {slots.map((slot) => (
                  <div key={slot.id}
                    className="group relative rounded-lg bg-primary/8 border border-primary/20 px-2 py-1.5 text-center">
                    <p className="text-label-sm font-semibold text-primary leading-none">
                      {formatTime(slot.open_time)}
                    </p>
                    <p className="text-label-sm text-primary/70 leading-none mt-0.5">
                      {formatTime(slot.close_time)}
                    </p>
                    {slot.max_slots && (
                      <p className="text-label-sm text-on-surface-variant mt-0.5">{slot.max_slots} max</p>
                    )}
                    {slot.label && (
                      <p className="text-label-sm text-on-surface-variant truncate" title={slot.label}>
                        {slot.label}
                      </p>
                    )}
                    {canManage && (
                      <div className="absolute inset-0 rounded-lg bg-surface-container-lowest/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button onClick={() => onEditSlot(slot)}
                          className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors">
                          <EditOutlined style={{ fontSize: 14 }} />
                        </button>
                        <button onClick={() => onDeleteSlot(slot)}
                          className="p-1 rounded text-on-surface-variant hover:text-error transition-colors">
                          <DeleteOutlined style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {canManage && (
                  <button onClick={() => onAddSlot(service.id, d)}
                    className="mt-auto flex items-center justify-center rounded-lg border border-dashed border-outline-variant hover:border-primary hover:text-primary text-on-surface-variant transition-colors py-1.5">
                    <AddOutlined style={{ fontSize: 14 }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [filterService, setFilterService] = useState<string>("");

  // Drawer state
  type DrawerMode = { type: "create"; serviceId: number; day: number } | { type: "edit"; schedule: ServiceSchedule } | null;
  const [drawer, setDrawer]       = useState<DrawerMode>(null);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerError, setDrawerError]   = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ServiceSchedule | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    Promise.all([listServices(), listSchedules()])
      .then(([svcs, scheds]) => { setServices(svcs); setSchedules(scheds); })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, [canView]);

  const visibleServices = services.filter((s) =>
    !filterService || String(s.id) === filterService
  );

  function openAdd(serviceId: number, day: number) {
    setDrawer({ type: "create", serviceId, day });
    setDrawerError(null);
  }

  function openEdit(schedule: ServiceSchedule) {
    setDrawer({ type: "edit", schedule });
    setDrawerError(null);
  }

  function closeDrawer() {
    setDrawer(null);
    setDrawerError(null);
  }

  async function handleSaveCreate(data: Omit<ScheduleCreateInput, "service_id" | "day_of_week">) {
    if (drawer?.type !== "create") return;
    setDrawerSaving(true);
    setDrawerError(null);
    try {
      const created = await createSchedule({
        service_id: drawer.serviceId,
        day_of_week: drawer.day,
        ...data,
      });
      setSchedules((s) => [...s, created]);
      closeDrawer();
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setDrawerSaving(false);
    }
  }

  async function handleSaveEdit(data: Omit<ScheduleCreateInput, "service_id" | "day_of_week">) {
    if (drawer?.type !== "edit") return;
    setDrawerSaving(true);
    setDrawerError(null);
    try {
      const updated = await updateSchedule(drawer.schedule.id, data);
      setSchedules((s) => s.map((x) => (x.id === updated.id ? updated : x)));
      closeDrawer();
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Erreur lors de la modification.");
    } finally {
      setDrawerSaving(false);
    }
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

  const drawerTitle = drawer?.type === "create"
    ? `Ajouter un horaire — ${DAYS[drawer.day]}`
    : drawer?.type === "edit"
    ? `Modifier l'horaire`
    : "";

  return (
    <DashboardShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface flex items-center gap-2">
              <ScheduleOutlined style={{ fontSize: 24 }} className="text-primary" />
              Horaires de consultation
            </h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Définissez les jours et heures de réception en consultation pour chaque service.
            </p>
          </div>
          <a href="/calendar"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
            <CalendarMonthOutlined style={{ fontSize: 18 }} />
            Retour au calendrier
          </a>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {/* Filter */}
        {services.length > 1 && (
          <div className="flex items-center gap-3">
            <select value={filterService} onChange={(e) => setFilterService(e.target.value)}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface-variant focus:outline-none">
              <option value="">Tous les services ({services.length})</option>
              {services.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.nom}</option>
              ))}
            </select>
            {filterService && (
              <button onClick={() => setFilterService("")}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors">
                <CloseOutlined style={{ fontSize: 16 }} />
              </button>
            )}
          </div>
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3">
            <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error shrink-0" />
            <p className="text-body-sm text-on-surface flex-1">
              Supprimer le créneau{" "}
              <strong>{DAYS[deleteTarget.day_of_week]} {formatTime(deleteTarget.open_time)}–{formatTime(deleteTarget.close_time)}</strong> ?
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

        {/* Content */}
        {loading ? (
          <p className="text-body-sm text-on-surface-variant py-8 text-center">Chargement…</p>
        ) : !canView ? (
          <p className="text-body-sm text-on-surface-variant text-center py-12">
            Vous n&apos;avez pas accès aux horaires.
          </p>
        ) : visibleServices.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AccessTimeOutlined style={{ fontSize: 40 }} className="text-outline" />
            <p className="text-body-md text-on-surface-variant">Aucun service enregistré.</p>
            <a href="/services" className="text-body-sm text-primary underline">Créer des services</a>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleServices.map((svc) => (
              <ServiceScheduleCard
                key={svc.id}
                service={svc}
                schedules={schedules.filter((s) => s.service_id === svc.id)}
                canManage={canManage}
                onAddSlot={openAdd}
                onEditSlot={openEdit}
                onDeleteSlot={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawer && (
        <RightDrawer title={drawerTitle} onClose={closeDrawer}>
          <div className="space-y-6">
            {drawer.type === "create" && (
              <>
                <p className="text-body-sm text-on-surface-variant">
                  Service : <strong>{services.find((s) => s.id === drawer.serviceId)?.nom}</strong>
                </p>
                <SlotForm
                  serviceId={drawer.serviceId}
                  dayOfWeek={drawer.day}
                  onSave={handleSaveCreate}
                  onCancel={closeDrawer}
                  saving={drawerSaving}
                  error={drawerError}
                />
              </>
            )}
            {drawer.type === "edit" && (
              <>
                <p className="text-body-sm text-on-surface-variant">
                  Service : <strong>{services.find((s) => s.id === drawer.schedule.service_id)?.nom}</strong>
                </p>
                <SlotForm
                  serviceId={drawer.schedule.service_id}
                  dayOfWeek={drawer.schedule.day_of_week}
                  initial={drawer.schedule}
                  onSave={handleSaveEdit}
                  onCancel={closeDrawer}
                  saving={drawerSaving}
                  error={drawerError}
                />
              </>
            )}
          </div>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}
