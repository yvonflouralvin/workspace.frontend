"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listStaff, listServices, createStaff, updateStaff, deleteStaff,
  searchHREmployees,
  type HostoStaff, type Service, type HREmployee, ROLE_LABELS, type StaffRole,
} from "@/app/lib/api";
import {
  AddOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined,
  FilterListOutlined, MedicalServicesOutlined,
  PersonSearchOutlined, WarningAmberOutlined,
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

// ─── Service multi-select dropdown ───────────────────────────────────────────

function ServiceDropdown({
  services, selected, onChange,
}: {
  services: Service[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const ref                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const active  = services.filter((s) => s.active);
  const filtered = active.filter((s) =>
    !query || s.nom.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase())
  );
  const selectedServices = services.filter((s) => selected.includes(s.id));

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface text-left hover:border-primary transition-colors">
        <span className={selected.length === 0 ? "text-on-surface-variant/50" : ""}>
          {selected.length === 0
            ? "Sélectionner des services…"
            : selectedServices.map((s) => s.nom).join(", ")}
        </span>
        <span className="text-on-surface-variant text-xs shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden">
          <div className="p-2 border-b border-outline-variant">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-body-sm text-on-surface-variant">Aucun service trouvé.</p>
            )}
            {filtered.map((s) => {
              const checked = selected.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container transition-colors text-left">
                  <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${checked ? "bg-primary border-primary" : "border-outline-variant"}`}>
                    {checked && <CheckOutlined style={{ fontSize: 11, color: "white" }} />}
                  </span>
                  <span className="text-body-sm text-on-surface">{s.nom}</span>
                  <span className="ml-auto text-label-sm text-on-surface-variant font-mono">{s.code}</span>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-outline-variant flex flex-wrap gap-1">
              {selectedServices.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-label-sm px-2 py-0.5 rounded-full">
                  {s.nom}
                  <button type="button" onClick={() => toggle(s.id)} className="hover:opacity-70">
                    <CloseOutlined style={{ fontSize: 11 }} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Employee search ──────────────────────────────────────────────────────────

function EmployeeSearch({
  onSelect,
}: {
  onSelect: (emp: HREmployee) => void;
}) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<HREmployee[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const ref                     = useRef<HTMLDivElement>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleQuery = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchHREmployees(q);
        setResults(res);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function select(emp: HREmployee) {
    onSelect(emp);
    setQuery(`${emp.first_name} ${emp.last_name}`);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <PersonSearchOutlined
          style={{ fontSize: 18 }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
        />
        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher un employé RH…"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-9 pr-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface-variant">…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto divide-y divide-outline-variant">
            {results.map((emp) => (
              <button key={emp.id} type="button" onClick={() => select(emp)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-surface-container transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 text-secondary text-body-sm font-semibold select-none">
                  {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-on-surface">{emp.first_name} {emp.last_name}</p>
                  <p className="text-body-sm text-on-surface-variant truncate">{emp.job_title ?? emp.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Create form
  const emptyForm = { employee_id: 0, nom_cache: "", prenom_cache: "", role: "MEDECIN" as StaffRole, service_ids: [] as number[], specialite: "" };
  const [showForm, setShowForm]             = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<HREmployee | null>(null);
  const [form, setForm]                     = useState(emptyForm);
  const [saving, setSaving]                 = useState(false);
  const [formError, setFormError]           = useState<string | null>(null);

  // Edit form
  const [editTarget, setEditTarget] = useState<HostoStaff | null>(null);
  const [editForm, setEditForm]     = useState<{ role: StaffRole; specialite: string; service_ids: number[] }>({
    role: "MEDECIN", specialite: "", service_ids: [],
  });
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<HostoStaff | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    Promise.all([listStaff({ active_only: false }), listServices()])
      .then(([s, svcs]) => { setStaff(s); setServices(svcs); })
      .catch(() => setError("Impossible de charger le personnel."))
      .finally(() => setLoading(false));
  }, [canView]);

  function handleEmployeeSelect(emp: HREmployee) {
    setSelectedEmployee(emp);
    setForm((f) => ({ ...f, employee_id: emp.id, nom_cache: emp.last_name, prenom_cache: emp.first_name }));
  }

  function resetForm() {
    setShowForm(false);
    setSelectedEmployee(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmployee) { setFormError("Veuillez sélectionner un employé."); return; }
    setSaving(true);
    setFormError(null);
    try {
      const member = await createStaff({
        employee_id: form.employee_id,
        nom_cache: form.nom_cache,
        prenom_cache: form.prenom_cache,
        role: form.role,
        specialite: form.specialite || undefined,
        service_ids: form.service_ids,
      });
      setStaff((s) => [...s, member]);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(member: HostoStaff) {
    setEditTarget(member);
    setEditForm({
      role: member.role,
      specialite: member.specialite ?? "",
      service_ids: member.services.map((s) => s.id),
    });
    setEditError(null);
    setShowForm(false);
  }

  function cancelEdit() {
    setEditTarget(null);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateStaff(editTarget.id, {
        role: editForm.role,
        specialite: editForm.specialite || undefined,
        service_ids: editForm.service_ids,
      });
      setStaff((s) => s.map((x) => (x.id === updated.id ? updated : x)));
      cancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur lors de la modification.");
    } finally {
      setEditSaving(false);
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
    if (filterService && !m.services.some((s) => String(s.id) === filterService)) return false;
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
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {staff.length} membre{staff.length !== 1 ? "s" : ""} enregistré{staff.length !== 1 ? "s" : ""}
            </p>
          </div>
          {canManage && !showForm && !editTarget && (
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors">
              <AddOutlined style={{ fontSize: 18 }} />
              Ajouter un membre
            </button>
          )}
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <FilterListOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
          <select
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface-variant focus:outline-none"
            value={filterService} onChange={(e) => setFilterService(e.target.value)}>
            <option value="">Tous les services</option>
            {services.map((s) => <option key={s.id} value={String(s.id)}>{s.nom}</option>)}
          </select>
          <select
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface-variant focus:outline-none"
            value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">Tous les rôles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate}
            className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-5">
            <div>
              <h2 className="text-body-md font-semibold text-on-surface">Ajouter un membre du personnel</h2>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                Recherchez l&apos;employé dans le système RH, puis configurez son rôle médical.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-label-md font-medium text-on-surface-variant">
                Employé RH <span className="text-error">*</span>
              </label>
              <EmployeeSearch onSelect={handleEmployeeSelect} />
              {selectedEmployee && (
                <div className="flex items-center gap-3 rounded-xl bg-secondary/5 border border-secondary/20 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 text-secondary text-body-sm font-semibold select-none">
                    {selectedEmployee.first_name.charAt(0)}{selectedEmployee.last_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-on-surface">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </p>
                    {selectedEmployee.job_title && (
                      <p className="text-body-sm text-on-surface-variant">{selectedEmployee.job_title}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => { setSelectedEmployee(null); setForm((f) => ({ ...f, employee_id: 0, nom_cache: "", prenom_cache: "" })); }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors">
                    <CloseOutlined style={{ fontSize: 16 }} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">
                  Rôle médical <span className="text-error">*</span>
                </label>
                <select className={selectCls} value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Spécialité</label>
                <input className={inputCls} value={form.specialite}
                  onChange={(e) => setForm((f) => ({ ...f, specialite: e.target.value }))}
                  placeholder="Ex: Cardiologie, Pédiatrie…" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">Service(s)</label>
              <ServiceDropdown
                services={services}
                selected={form.service_ids}
                onChange={(ids) => setForm((f) => ({ ...f, service_ids: ids }))}
              />
            </div>

            {formError && <p className="text-body-sm text-error">{formError}</p>}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={resetForm} disabled={saving}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button type="submit" disabled={saving || !selectedEmployee}
                className="px-6 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
                {saving ? "Enregistrement…" : "Ajouter"}
              </button>
            </div>
          </form>
        )}

        {/* Edit drawer */}
        {editTarget && (
          <RightDrawer
            title={`${editTarget.prenom_cache} ${editTarget.nom_cache}`}
            onClose={cancelEdit}
          >
            <form onSubmit={handleEditSubmit} className="h-full flex flex-col gap-5">
              <div className="flex-1 space-y-5 overflow-y-auto">
                <p className="text-body-sm text-on-surface-variant">
                  Modifiez le rôle, la spécialité et les services affectés.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-medium text-on-surface-variant">
                      Rôle médical <span className="text-error">*</span>
                    </label>
                    <select className={selectCls} value={editForm.role}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as StaffRole }))}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md font-medium text-on-surface-variant">Spécialité</label>
                    <input className={inputCls} value={editForm.specialite}
                      onChange={(e) => setEditForm((f) => ({ ...f, specialite: e.target.value }))}
                      placeholder="Ex: Cardiologie, Pédiatrie…" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface-variant">Service(s)</label>
                  <ServiceDropdown
                    services={services}
                    selected={editForm.service_ids}
                    onChange={(ids) => setEditForm((f) => ({ ...f, service_ids: ids }))}
                  />
                </div>

                {editError && <p className="text-body-sm text-error">{editError}</p>}
              </div>

              <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
                  {editSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button type="button" onClick={cancelEdit} disabled={editSaving}
                  className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                  Annuler
                </button>
              </div>
            </form>
          </RightDrawer>
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
            Aucun membre du personnel enregistré.
          </p>
        )}

        {!loading && active.length > 0 && (
          <StaffTable title="Actif" items={active} canManage={canManage}
            onEdit={openEdit} onToggle={toggleActive} onDelete={setDeleteTarget} />
        )}
        {!loading && inactive.length > 0 && (
          <StaffTable title="Inactif" items={inactive} canManage={canManage}
            onEdit={openEdit} onToggle={toggleActive} onDelete={setDeleteTarget} dimmed />
        )}
      </div>
    </DashboardShell>
  );
}

function StaffTable({
  title, items, canManage, onEdit, onToggle, onDelete, dimmed,
}: {
  title: string; items: HostoStaff[]; canManage: boolean;
  onEdit: (m: HostoStaff) => void;
  onToggle: (m: HostoStaff) => void;
  onDelete: (m: HostoStaff) => void;
  dimmed?: boolean;
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
                {m.specialite && (
                  <span className="text-body-sm text-on-surface-variant">{m.specialite}</span>
                )}
                {m.services.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
                    <MedicalServicesOutlined style={{ fontSize: 13 }} />
                    {m.services.map((s) => s.nom).join(", ")}
                  </span>
                )}
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(m)}
                  title="Modifier"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors">
                  <EditOutlined style={{ fontSize: 17 }} />
                </button>
                <button onClick={() => onToggle(m)}
                  className="px-3 py-1.5 rounded-lg text-label-sm text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors">
                  {m.active ? "Désactiver" : "Réactiver"}
                </button>
                <button onClick={() => onDelete(m)}
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
