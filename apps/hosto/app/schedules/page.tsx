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
  AddOutlined, CalendarMonthOutlined, DeleteOutlined, EditOutlined,
  ScheduleOutlined, WarningAmberOutlined,
} from "@mui/icons-material";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

function fmt(t: string) {
  return t.slice(0, 5); // "08:00:00" → "08:00"
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
          <label className="text-label-md font-medium text-on-surface-variant">
            Ouverture <span className="text-error">*</span>
          </label>
          <input type="time" className={inputCls} value={openTime}
            onChange={(e) => setOpenTime(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md font-medium text-on-surface-variant">
            Fermeture <span className="text-error">*</span>
          </label>
          <input type="time" className={inputCls} value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Capacité max</label>
        <input type="number" min={1} className={inputCls} value={maxSlots}
          onChange={(e) => setMaxSlots(e.target.value)} placeholder="Illimitée" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-label-md font-medium text-on-surface-variant">Libellé (optionnel)</label>
        <input className={inputCls} value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex : Consultations du matin" />
      </div>
      {error && <p className="text-body-sm text-error">{error}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={saving}
          onClick={() =>
            onSave({
              open_time: openTime + ":00",
              close_time: closeTime + ":00",
              max_slots: maxSlots ? Number(maxSlots) : undefined,
              label: label || undefined,
            })
          }
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

// ─── Cell : slots for one service × one day ───────────────────────────────────

function DayCell({
  slots,
  canManage,
  onAdd,
  onEdit,
  onDelete,
}: {
  slots: ServiceSchedule[];
  canManage: boolean;
  onAdd: () => void;
  onEdit: (s: ServiceSchedule) => void;
  onDelete: (s: ServiceSchedule) => void;
}) {
  return (
    <td className="align-top border border-outline-variant px-2 py-2 min-w-[90px]">
      <div className="flex flex-col gap-1">
        {slots.map((slot) => (
          <div key={slot.id} className="group relative rounded-lg bg-primary/8 border border-primary/15 px-2 py-1.5">
            <p className="text-label-sm font-semibold text-primary tabular-nums leading-none">
              {fmt(slot.open_time)} – {fmt(slot.close_time)}
            </p>
            {slot.label && (
              <p className="text-label-sm text-on-surface-variant truncate mt-0.5" title={slot.label}>
                {slot.label}
              </p>
            )}
            {slot.max_slots != null && (
              <p className="text-label-sm text-on-surface-variant mt-0.5">{slot.max_slots} max</p>
            )}
            {canManage && (
              <div className="absolute inset-0 rounded-lg bg-surface-container-lowest/92 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button onClick={() => onEdit(slot)}
                  className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors" title="Modifier">
                  <EditOutlined style={{ fontSize: 14 }} />
                </button>
                <button onClick={() => onDelete(slot)}
                  className="p-1 rounded text-on-surface-variant hover:text-error transition-colors" title="Supprimer">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const { can }   = usePermissions();
  const canView   = can("hosto.schedules.view");
  const canManage = can("hosto.schedules.manage");

  const [services, setServices]   = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

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
    Promise.all([listServices(), listSchedules()])
      .then(([svcs, scheds]) => { setServices(svcs); setSchedules(scheds); })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, [canView]);

  function serviceName(id: number) {
    return services.find((s) => s.id === id)?.nom ?? "";
  }

  function openAdd(serviceId: number, day: number) {
    setDrawer({ type: "create", serviceId, day, serviceName: serviceName(serviceId) });
    setDrawerError(null);
  }

  function openEdit(schedule: ServiceSchedule) {
    setDrawer({ type: "edit", schedule, serviceName: serviceName(schedule.service_id) });
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

  const drawerTitle =
    drawer?.type === "create"
      ? `Ajouter — ${DAYS[drawer.day]}`
      : drawer?.type === "edit"
      ? "Modifier l'horaire"
      : "";

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
              Définissez les créneaux d&apos;ouverture de chaque service pour chaque jour de la semaine.
            </p>
          </div>
          <a href="/calendar"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
            <CalendarMonthOutlined style={{ fontSize: 16 }} />
            Retour au calendrier
          </a>
        </div>

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3">
            <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error shrink-0" />
            <p className="text-body-sm text-on-surface flex-1">
              Supprimer le créneau{" "}
              <strong>
                {DAYS[deleteTarget.day_of_week]} {fmt(deleteTarget.open_time)}–{fmt(deleteTarget.close_time)}
              </strong>{" "}
              ({serviceName(deleteTarget.service_id)}) ?
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

        {/* Table */}
        {loading ? (
          <p className="text-body-sm text-on-surface-variant py-8 text-center">Chargement…</p>
        ) : !canView ? (
          <p className="text-body-sm text-on-surface-variant text-center py-12">
            Vous n&apos;avez pas accès aux horaires.
          </p>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ScheduleOutlined style={{ fontSize: 40 }} className="text-outline" />
            <p className="text-body-md text-on-surface-variant">Aucun service enregistré.</p>
            <a href="/services" className="text-body-sm text-primary underline">Créer des services</a>
          </div>
        ) : (
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
                      {/* Service name */}
                      <td className="border border-outline-variant px-4 py-3 align-top">
                        <div>
                          <p className="text-body-md font-medium text-on-surface">{svc.nom}</p>
                          <p className="text-label-sm font-mono text-on-surface-variant">{svc.code}</p>
                          {!svc.active && (
                            <span className="text-label-sm px-1.5 py-0.5 rounded bg-error/10 text-error mt-0.5 inline-block">
                              Archivé
                            </span>
                          )}
                        </div>
                      </td>
                      {/* One cell per day */}
                      {DAYS.map((_, d) => {
                        const daySlots = svcSchedules.filter((s) => s.day_of_week === d);
                        return (
                          <DayCell
                            key={d}
                            slots={daySlots}
                            canManage={canManage}
                            onAdd={() => openAdd(svc.id, d)}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                          />
                        );
                      })}
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
