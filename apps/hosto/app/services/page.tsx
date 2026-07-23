"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listServices, createService, updateService, deleteService,
  type Service, type ServiceCreateInput,
} from "@/app/lib/api";
import {
  AddOutlined, ArchiveOutlined, DeleteOutlined, LockOutlined,
  LocalHospitalOutlined, UnarchiveOutlined, WarningAmberOutlined,
} from "@mui/icons-material";

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

export default function ServicesPage() {
  const { can } = usePermissions();
  const canView   = can("hosto.services.view");
  const canManage = can("hosto.services.manage");

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [showForm, setShowForm]    = useState(false);
  const [form, setForm]            = useState<ServiceCreateInput>({ nom: "", code: "", description: "" });
  const [saving, setSaving]        = useState(false);
  const [formError, setFormError]  = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    listServices()
      .then(setServices)
      .catch(() => setError("Impossible de charger les services."))
      .finally(() => setLoading(false));
  }, [canView]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const svc = await createService(form);
      setServices((s) => [...s, svc].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowForm(false);
      setForm({ nom: "", code: "", description: "" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(svc: Service) {
    try {
      const updated = await updateService(svc.id, { active: !svc.active });
      setServices((s) => s.map((x) => (x.id === svc.id ? updated : x)));
    } catch {}
  }

  async function handleDelete(svc: Service) {
    try {
      await deleteService(svc.id);
      setServices((s) => s.filter((x) => x.id !== svc.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer.");
    }
  }

  const active   = services.filter((s) => s.active);
  const archived = services.filter((s) => !s.active);

  return (
    <DashboardShell>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-sm font-display text-on-surface">Services médicaux</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">{services.length} service{services.length !== 1 ? "s" : ""} configuré{services.length !== 1 ? "s" : ""}</p>
          </div>
          {canManage && !showForm && (
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors">
              <AddOutlined style={{ fontSize: 18 }} />
              Nouveau service
            </button>
          )}
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
            <h2 className="text-body-md font-semibold text-on-surface">Nouveau service</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Nom <span className="text-error">*</span></label>
                <input className={inputCls} required value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Ex: Cardiologie" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Code <span className="text-error">*</span></label>
                <input className={inputCls} required value={form.code} maxLength={20}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="Ex: CAR" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">Description</label>
              <input className={inputCls} value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle" />
            </div>
            {formError && <p className="text-body-sm text-error">{formError}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} disabled={saving}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
                {saving ? "Enregistrement…" : "Créer"}
              </button>
            </div>
          </form>
        )}

        {loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {/* Confirm delete */}
        {deleteTarget && (
          <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3">
            <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error shrink-0" />
            <p className="text-body-sm text-on-surface flex-1">
              Supprimer le service <strong>{deleteTarget.nom}</strong> ? Cette action est irréversible.
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

        {/* Services list */}
        {!loading && (
          <ServiceList
            title="Services actifs"
            items={active}
            canManage={canManage}
            onToggle={toggleActive}
            onDelete={setDeleteTarget}
          />
        )}
        {!loading && archived.length > 0 && (
          <ServiceList
            title="Archivés"
            items={archived}
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

function ServiceList({
  title, items, canManage, onToggle, onDelete, dimmed,
}: {
  title: string; items: Service[]; canManage: boolean;
  onToggle: (s: Service) => void; onDelete: (s: Service) => void; dimmed?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="text-body-sm font-semibold text-on-surface-variant mb-3 uppercase tracking-wider">{title}</h2>
      <div className="rounded-2xl border border-outline-variant overflow-hidden divide-y divide-outline-variant">
        {items.map((svc) => (
          <div key={svc.id} className={`flex items-center gap-4 px-5 py-3.5 ${dimmed ? "opacity-60" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
              <LocalHospitalOutlined style={{ fontSize: 18 }} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-md font-medium text-on-surface">{svc.nom}</span>
                <span className="text-label-sm font-mono px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant">{svc.code}</span>
                {svc.is_system && (
                  <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
                    <LockOutlined style={{ fontSize: 11 }} />Système
                  </span>
                )}
              </div>
              {svc.description && <p className="text-body-sm text-on-surface-variant mt-0.5">{svc.description}</p>}
            </div>
            {canManage && !svc.is_system && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onToggle(svc)} title={svc.active ? "Archiver" : "Réactiver"}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                  {svc.active
                    ? <ArchiveOutlined style={{ fontSize: 17 }} />
                    : <UnarchiveOutlined style={{ fontSize: 17 }} />}
                </button>
                <button onClick={() => onDelete(svc)} title="Supprimer"
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
