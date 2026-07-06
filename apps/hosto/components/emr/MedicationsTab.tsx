"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  AddOutlined, DeleteOutlined, EditOutlined, MedicationOutlined,
} from "@mui/icons-material";
import {
  getPatientMedications, createMedication, updateMedication, removeMedication,
  type MedicationStatementRead, type MedicationCreate, type MedicationStatus,
} from "@/app/lib/emr-api";

// ─── Constants ───────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const selectCls = inputCls;
const labelCls = "text-label-md font-medium text-on-surface-variant";

const STATUS_LABEL: Record<MedicationStatus, string> = { EN_COURS: "En cours", ARRETE: "Arrêté" };
const STATUS_CLS: Record<MedicationStatus, string> = {
  EN_COURS: "bg-secondary/10 text-secondary",
  ARRETE: "bg-surface-container text-on-surface-variant",
};

type FilterStatus = "EN_COURS" | "ARRETE" | "all";

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  medication: "",
  dosage: "",
  frequency: "",
  route: "",
  clinical_status: "EN_COURS" as MedicationStatus,
  started_at: "",
  stopped_at: "",
  notes: "",
};

type MedicationForm = typeof EMPTY_FORM;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="rounded-2xl border border-outline-variant overflow-hidden divide-y divide-outline-variant" aria-busy>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-surface-container animate-pulse" />
            <div className="h-3 w-32 rounded bg-surface-container animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-surface-container animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MedicationsTab({
  patientId,
  canWrite,
  onMutation,
}: {
  patientId: number;
  canWrite: boolean;
  onMutation?: () => void;
}) {
  const [items, setItems] = useState<MedicationStatementRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("EN_COURS");

  const [drawer, setDrawer] = useState<null | { mode: "create" } | { mode: "edit"; item: MedicationStatementRead }>(null);
  const [form, setForm] = useState<MedicationForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MedicationStatementRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPatientMedications(patientId)
      .then(setItems)
      .catch(() => setError("Impossible de charger les traitements."))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const visible = filter === "all" ? items : items.filter((m) => m.clinical_status === filter);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawer({ mode: "create" });
  }

  function openEdit(item: MedicationStatementRead) {
    setForm({
      medication: item.medication,
      dosage: item.dosage ?? "",
      frequency: item.frequency ?? "",
      route: item.route ?? "",
      clinical_status: item.clinical_status,
      started_at: item.started_at ? item.started_at.slice(0, 10) : "",
      stopped_at: item.stopped_at ? item.stopped_at.slice(0, 10) : "",
      notes: item.notes ?? "",
    });
    setFormError(null);
    setDrawer({ mode: "edit", item });
  }

  function closeDrawer() { setDrawer(null); setFormError(null); }

  function setField<K extends keyof MedicationForm>(key: K, value: MedicationForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.medication.trim()) { setFormError("Le médicament est requis."); return; }
    setSaving(true); setFormError(null);
    try {
      const payload: MedicationCreate = {
        patient_id: patientId,
        medication: form.medication.trim(),
        dosage: form.dosage.trim() || null,
        frequency: form.frequency.trim() || null,
        route: form.route.trim() || null,
        clinical_status: form.clinical_status,
        started_at: form.started_at || null,
        stopped_at: form.stopped_at || null,
        notes: form.notes.trim() || null,
      };
      if (drawer?.mode === "create") {
        await createMedication(payload);
      } else if (drawer?.mode === "edit") {
        const { patient_id: _, ...rest } = payload;
        await updateMedication(drawer.item.id, rest);
      }
      closeDrawer();
      load();
      onMutation?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeMedication(deleteTarget.id);
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      onMutation?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-body-md font-semibold text-on-surface">Traitements</h2>
          {!loading && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {items.length} entrée{items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-xl border border-outline-variant overflow-hidden">
            {(["EN_COURS", "ARRETE", "all"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-body-sm transition-colors ${filter === f ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>
                {f === "EN_COURS" ? "En cours" : f === "ARRETE" ? "Arrêtés" : "Tous"}
              </button>
            ))}
          </div>
          {canWrite && (
            <button type="button" onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors">
              <AddOutlined style={{ fontSize: 18 }} />
              Ajouter
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {/* ── List ── */}
      {loading ? (
        <Skeleton />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <MedicationOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">
            {filter === "EN_COURS" ? "Aucun traitement en cours." : filter === "ARRETE" ? "Aucun traitement arrêté." : "Aucun traitement enregistré."}
          </p>
          {canWrite && (
            <button type="button" onClick={openCreate}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
              Ajouter un traitement
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant overflow-hidden divide-y divide-outline-variant bg-surface-container-lowest">
          {visible.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-md font-semibold text-on-surface">{item.medication}</span>
                  <span className={`text-label-sm px-2 py-0.5 rounded-full ${STATUS_CLS[item.clinical_status]}`}>
                    {STATUS_LABEL[item.clinical_status]}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 flex-wrap text-body-sm text-on-surface-variant">
                  {(item.dosage || item.frequency || item.route) && (
                    <span>{[item.dosage, item.frequency, item.route].filter(Boolean).join(" · ")}</span>
                  )}
                  {item.started_at && (
                    <>
                      {(item.dosage || item.frequency || item.route) && <span className="text-on-surface-variant/30">·</span>}
                      <span>Depuis le {new Date(item.started_at).toLocaleDateString("fr-FR")}</span>
                    </>
                  )}
                  {item.stopped_at && (
                    <>
                      <span className="text-on-surface-variant/30">·</span>
                      <span>Arrêté le {new Date(item.stopped_at).toLocaleDateString("fr-FR")}</span>
                    </>
                  )}
                  {item.notes && (
                    <>
                      <span className="text-on-surface-variant/30">·</span>
                      <span className="truncate max-w-xs italic">{item.notes}</span>
                    </>
                  )}
                </div>
              </div>
              {canWrite && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} title="Modifier"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors">
                    <EditOutlined style={{ fontSize: 17 }} />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} title="Supprimer"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors">
                    <DeleteOutlined style={{ fontSize: 17 }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <Modal title="Supprimer le traitement" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-body-md text-on-surface mb-5">
            Supprimer <strong>{deleteTarget.medication}</strong> de la liste des traitements ?
          </p>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
              className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 rounded-xl text-body-md bg-error text-white hover:opacity-90 disabled:opacity-50">
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Drawer ── */}
      {drawer && (
        <RightDrawer
          title={drawer.mode === "create" ? "Nouveau traitement" : drawer.mode === "edit" ? drawer.item.medication : ""}
          onClose={closeDrawer}
        >
          <form onSubmit={handleSubmit} className="h-full flex flex-col gap-5 overflow-y-auto">
            <div className="flex-1 space-y-4 overflow-y-auto">

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Médicament (DCI ou nom) <span className="text-error">*</span></label>
                <input className={inputCls} value={form.medication} autoFocus
                  onChange={(e) => setField("medication", e.target.value)}
                  placeholder="Ex: Metformine, Amlodipine, Aspirine…" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Dosage</label>
                  <input className={inputCls} value={form.dosage}
                    onChange={(e) => setField("dosage", e.target.value)}
                    placeholder="Ex: 500 mg, 10 mg…" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Fréquence</label>
                  <input className={inputCls} value={form.frequency}
                    onChange={(e) => setField("frequency", e.target.value)}
                    placeholder="Ex: 2x/jour, matin…" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Voie d'administration</label>
                  <input className={inputCls} value={form.route}
                    onChange={(e) => setField("route", e.target.value)}
                    placeholder="Ex: Orale, IV, SC…" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Statut</label>
                  <select className={selectCls} value={form.clinical_status}
                    onChange={(e) => setField("clinical_status", e.target.value as MedicationStatus)}>
                    <option value="EN_COURS">En cours</option>
                    <option value="ARRETE">Arrêté</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Date de début</label>
                  <input type="date" className={inputCls} value={form.started_at}
                    onChange={(e) => setField("started_at", e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Date d'arrêt</label>
                  <input type="date" className={inputCls} value={form.stopped_at}
                    onChange={(e) => setField("stopped_at", e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Notes</label>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Informations complémentaires, contre-indications…" />
              </div>

              {formError && <p className="text-body-sm text-error">{formError}</p>}
            </div>

            <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
                {saving ? "Enregistrement…" : drawer.mode === "create" ? "Ajouter" : "Enregistrer"}
              </button>
              <button type="button" onClick={closeDrawer} disabled={saving}
                className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                Annuler
              </button>
            </div>
          </form>
        </RightDrawer>
      )}
    </>
  );
}
