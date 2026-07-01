"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listStaff, listServices, createStaff, updateStaff, deleteStaff,
  type HostoStaff, type Service, type StaffCreateInput, ROLE_LABELS, type StaffRole,
} from "@/app/lib/api";
import {
  AddOutlined, DeleteOutlined, MedicalServicesOutlined,
  WarningAmberOutlined, FilterListOutlined,
} from "@mui/icons-material";

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const selectCls = inputCls;

const ROLES: StaffRole[] = ["MEDECIN", "INFIRMIER", "AIDE_SOIGNANT", "SECRETAIRE", "AUTRE"];

const ROLE_COLORS: Record<StaffRole, string> = {
  MEDECIN: "bg-primary/10 text-primary",
  INFIRMIER: "bg-tertiary/10 text-tertiary",
  AIDE_SOIGNANT: "bg-secondary/10 text-secondary",
  SECRETAIRE: "bg-surface-container text-on-surface-variant",
  AUTRE: "bg-surface-container text-on-surface-variant",
};

export default function StaffPage() {
  const { can } = usePermissions();
  const canView   = can("hosto.staff.view");
  const canManage = can("hosto.staff.manage");

  const [staff, setStaff]       = useState<HostoStaff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [filterService, setFilterService] = useState<string>("");
  const [filterRole, setFilterRole]       = useState<string>("");

  const [showForm, setShowForm]    = useState(false);
  const [form, setForm]            = useState<StaffCreateInput>({
    employee_id: 0, nom_cache: "", prenom_cache: "", role: "MEDECIN",
  });
  const [saving, setSaving]        = useState(false);
  const [formError, setFormError]  = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HostoStaff | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    Promise.all([
      listStaff({ active_only: false }),
      listServices(),
    ])
      .then(([s, svcs]) => { setStaff(s); setServices(svcs); })
      .catch(() => setError("Impossible de charger le personnel."))
      .finally(() => setLoading(false));
  }, [canView]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const member = await createStaff({
        ...form,
        employee_id: Number(form.employee_id),
        service_id: form.service_id ? Number(form.service_id) : undefined,
      });
      setStaff((s) => [...s, member]);
      setShowForm(false);
      setForm({ employee_id: 0, nom_cache: "", prenom_cache: "", role: "MEDECIN" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: HostoStaff) {
    try {
      const updated = await updateStaff(member.id, { active: !member.active });
      setStaff((s) => s.map((x) => (x.id === member.id ? updated : x)));
    } catch {}
  }

  async function handleDelete(member: HostoStaff) {
    try {
      await deleteStaff(member.id);
      setStaff((s) => s.filter((x) => x.id !== member.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer.");
    }
  }

  const filtered = staff.filter((m) => {
    if (filterService && String(m.service_id) !== filterService) return false;
    if (filterRole && m.role !== filterRole) return false;
    return true;
  });

  const active   = filtered.filter((m) => m.active);
  const inactive = filtered.filter((m) => !m.active);

  return (
    <DashboardShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface">Personnel médical</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">{staff.length} membre{staff.length !== 1 ? "s" : ""} enregistré{staff.length !== 1 ? "s" : ""}</p>
          </div>
          {canManage && !showForm && (
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors">
              <AddOutlined style={{ fontSize: 18 }} />
              Ajouter
            </button>
          )}
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <FilterListOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
          <select className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface-variant focus:outline-none"
            value={filterService} onChange={(e) => setFilterService(e.target.value)}>
            <option value="">Tous les services</option>
            {services.map((s) => <option key={s.id} value={String(s.id)}>{s.nom}</option>)}
          </select>
          <select className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface-variant focus:outline-none"
            value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">Tous les rôles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
            <h2 className="text-body-md font-semibold text-on-surface">Ajouter un membre</h2>
            <p className="text-body-sm text-on-surface-variant">Renseignez l'ID employé RH et les informations du poste.</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Nom <span className="text-error">*</span></label>
                <input className={inputCls} required value={form.nom_cache}
                  onChange={(e) => setForm((f) => ({ ...f, nom_cache: e.target.value }))} placeholder="Nom" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Prénom <span className="text-error">*</span></label>
                <input className={inputCls} required value={form.prenom_cache}
                  onChange={(e) => setForm((f) => ({ ...f, prenom_cache: e.target.value }))} placeholder="Prénom" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">ID Employé RH <span className="text-error">*</span></label>
                <input className={inputCls} required type="number" min={1} value={form.employee_id || ""}
                  onChange={(e) => setForm((f) => ({ ...f, employee_id: Number(e.target.value) }))} placeholder="Ex: 42" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Rôle <span className="text-error">*</span></label>
                <select className={selectCls} value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Spécialité</label>
                <input className={inputCls} value={form.specialite ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, specialite: e.target.value }))} placeholder="Ex: Cardiologie" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Service</label>
                <select className={selectCls} value={form.service_id ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value ? Number(e.target.value) : undefined }))}>
                  <option value="">— Aucun —</option>
                  {services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
            </div>
            {formError && <p className="text-body-sm text-error">{formError}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} disabled={saving}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
                {saving ? "Enregistrement…" : "Ajouter"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {/* Delete confirm */}
        {deleteTarget && (
          <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3">
            <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error shrink-0" />
            <p className="text-body-sm text-on-surface flex-1">
              Retirer <strong>{deleteTarget.prenom_cache} {deleteTarget.nom_cache}</strong> du personnel ?
            </p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteTarget)}
                className="px-3 py-1.5 rounded-lg text-body-sm bg-error text-white hover:opacity-90">
                Retirer
              </button>
            </div>
          </div>
        )}

        {/* Staff list */}
        {!loading && active.length === 0 && inactive.length === 0 && (
          <p className="text-body-sm text-on-surface-variant text-center py-12">
            Aucun membre du personnel trouvé.
          </p>
        )}

        {!loading && active.length > 0 && (
          <StaffTable
            title="Actif"
            items={active}
            canManage={canManage}
            onToggle={toggleActive}
            onDelete={setDeleteTarget}
          />
        )}
        {!loading && inactive.length > 0 && (
          <StaffTable
            title="Inactif"
            items={inactive}
            canManage={canManage}
            onToggle={toggleActive}
            onDelete={setDeleteTarget}
            dimmed
          />
        )}
      </div>
    </DashboardShell>
  );
}

function StaffTable({
  title, items, canManage, onToggle, onDelete, dimmed,
}: {
  title: string; items: HostoStaff[]; canManage: boolean;
  onToggle: (m: HostoStaff) => void; onDelete: (m: HostoStaff) => void; dimmed?: boolean;
}) {
  return (
    <div>
      <h2 className="text-body-sm font-semibold text-on-surface-variant mb-3 uppercase tracking-wider">{title}</h2>
      <div className={`rounded-2xl border border-outline-variant overflow-hidden divide-y divide-outline-variant ${dimmed ? "opacity-60" : ""}`}>
        {items.map((m) => (
          <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 text-secondary font-semibold text-body-md select-none">
              {m.prenom_cache.charAt(0)}{m.nom_cache.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-md font-medium text-on-surface">
                  {m.prenom_cache} {m.nom_cache}
                </span>
                <span className={`text-label-sm px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role]}`}>
                  {ROLE_LABELS[m.role]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {m.specialite && <span className="text-body-sm text-on-surface-variant">{m.specialite}</span>}
                {m.service && (
                  <span className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
                    <MedicalServicesOutlined style={{ fontSize: 13 }} />
                    {m.service.nom}
                  </span>
                )}
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onToggle(m)}
                  title={m.active ? "Désactiver" : "Réactiver"}
                  className="px-3 py-1.5 rounded-lg text-label-sm text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors">
                  {m.active ? "Désactiver" : "Réactiver"}
                </button>
                <button onClick={() => onDelete(m)} title="Retirer"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors">
                  <DeleteOutlined style={{ fontSize: 17 }} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
