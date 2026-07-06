"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  AddOutlined, AssignmentOutlined, DeleteOutlined, EditOutlined,
} from "@mui/icons-material";
import {
  getPatientConditions, createCondition, updateCondition, removeCondition, searchICD10,
  type ConditionRead, type ConditionCreate, type ConditionStatus, type ICD10Result,
} from "@/app/lib/emr-api";
import { ConditionForm } from "./ConditionForm";

// ─── Constants ───────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const selectCls = inputCls;
const labelCls = "text-label-md font-medium text-on-surface-variant";

const STATUS_LABEL: Record<ConditionStatus, string> = { ACTIF: "Actif", RESOLU: "Résolu", INACTIF: "Inactif" };

const STATUS_CLS: Record<ConditionStatus, string> = {
  ACTIF: "bg-secondary/10 text-secondary",
  RESOLU: "bg-surface-container text-on-surface-variant",
  INACTIF: "bg-surface-container text-on-surface-variant",
};

type FilterStatus = "ACTIF" | "RESOLU" | "all";

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  label: "",
  icd10_code: null as string | null,
  icd10_label: "",
  clinical_status: "ACTIF" as ConditionStatus,
  onset_date: "",
  resolved_date: "",
  notes: "",
};

type ConditionFormState = typeof EMPTY_FORM;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="rounded-2xl border border-outline-variant overflow-hidden divide-y divide-outline-variant" aria-busy>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-surface-container animate-pulse" />
            <div className="h-3 w-24 rounded bg-surface-container animate-pulse" />
          </div>
          <div className="h-6 w-16 rounded-full bg-surface-container animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── ICD10 fetch for SearchSelect ─────────────────────────────────────────────

async function fetchICD10Options(q: string): Promise<ICD10Result[]> {
  return searchICD10(q);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConditionsTab({
  patientId,
  canWrite,
  onMutation,
  encounterId,
  onSplit,
  onCloseSplit,
}: {
  patientId: number;
  canWrite: boolean;
  onMutation?: () => void;
  encounterId?: number;
  onSplit?: (title: string, content: React.ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  const [items, setItems] = useState<ConditionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("ACTIF");

  const [drawer, setDrawer] = useState<null | { mode: "create" } | { mode: "edit"; item: ConditionRead }>(null);
  const [form, setForm] = useState<ConditionFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ConditionRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPatientConditions(patientId)
      .then(setItems)
      .catch(() => setError("Impossible de charger les problèmes."))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const visible = filter === "all" ? items : items.filter((c) => c.clinical_status === filter);

  function openCreate() {
    if (onSplit) {
      onSplit("Nouveau problème", (
        <ConditionForm
          patientId={patientId}
          encounterId={encounterId}
          onSaved={() => { load(); onMutation?.(); onCloseSplit?.(); }}
          onClose={() => onCloseSplit?.()}
        />
      ));
      return;
    }
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawer({ mode: "create" });
  }

  function openEdit(item: ConditionRead) {
    if (onSplit) {
      onSplit(item.label, (
        <ConditionForm
          patientId={patientId}
          encounterId={encounterId}
          initialData={item}
          onSaved={() => { load(); onMutation?.(); onCloseSplit?.(); }}
          onClose={() => onCloseSplit?.()}
        />
      ));
      return;
    }
    setForm({
      label: item.label,
      icd10_code: item.icd10_code ?? null,
      icd10_label: item.icd10_code ?? "",
      clinical_status: item.clinical_status,
      onset_date: item.onset_date ? item.onset_date.slice(0, 10) : "",
      resolved_date: item.resolved_date ? item.resolved_date.slice(0, 10) : "",
      notes: item.notes ?? "",
    });
    setFormError(null);
    setDrawer({ mode: "edit", item });
  }

  function closeDrawer() { setDrawer(null); setFormError(null); }

  function setField<K extends keyof ConditionFormState>(key: K, value: ConditionFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) { setFormError("Le libellé est requis."); return; }
    setSaving(true); setFormError(null);
    try {
      const payload: ConditionCreate = {
        patient_id: patientId,
        label: form.label.trim(),
        icd10_code: form.icd10_code || null,
        clinical_status: form.clinical_status,
        onset_date: form.onset_date || null,
        resolved_date: form.resolved_date || null,
        notes: form.notes.trim() || null,
        ...(encounterId !== undefined ? { encounter_id: encounterId } : {}),
      };
      if (drawer?.mode === "create") {
        await createCondition(payload);
      } else if (drawer?.mode === "edit") {
        const { patient_id: _, ...rest } = payload;
        await updateCondition(drawer.item.id, rest);
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
      await removeCondition(deleteTarget.id);
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
          <h2 className="text-body-md font-semibold text-on-surface">Liste de problèmes</h2>
          {!loading && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {items.length} entrée{items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter pills */}
          <div className="flex rounded-xl border border-outline-variant overflow-hidden">
            {(["ACTIF", "RESOLU", "all"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-body-sm transition-colors ${filter === f ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>
                {f === "ACTIF" ? "Actifs" : f === "RESOLU" ? "Résolus" : "Tous"}
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
          <AssignmentOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">
            {filter === "ACTIF" ? "Aucun problème actif." : filter === "RESOLU" ? "Aucun problème résolu." : "Aucun problème enregistré."}
          </p>
          {canWrite && (
            <button type="button" onClick={openCreate}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
              Ajouter un problème
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant overflow-hidden divide-y divide-outline-variant bg-surface-container-lowest">
          {visible.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-md font-semibold text-on-surface">{item.label}</span>
                  {item.icd10_code && (
                    <span className="text-label-sm font-mono bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">
                      {item.icd10_code}
                    </span>
                  )}
                  <span className={`text-label-sm px-2 py-0.5 rounded-full ${STATUS_CLS[item.clinical_status]}`}>
                    {STATUS_LABEL[item.clinical_status]}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-body-sm text-on-surface-variant flex-wrap">
                  {item.onset_date && (
                    <span>Depuis le {new Date(item.onset_date).toLocaleDateString("fr-FR")}</span>
                  )}
                  {item.resolved_date && (
                    <>
                      <span className="text-on-surface-variant/30">·</span>
                      <span>Résolu le {new Date(item.resolved_date).toLocaleDateString("fr-FR")}</span>
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
        <Modal title="Supprimer le problème" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-body-md text-on-surface mb-5">
            Supprimer <strong>{deleteTarget.label}</strong> de la liste de problèmes ?
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

      {/* ── Drawer (fallback when onSplit not provided) ── */}
      {drawer && (
        <RightDrawer
          title={drawer.mode === "create" ? "Nouveau problème" : drawer.mode === "edit" ? drawer.item.label : ""}
          onClose={closeDrawer}
        >
          <form onSubmit={handleSubmit} className="h-full flex flex-col gap-5 overflow-y-auto">
            <div className="flex-1 space-y-4 overflow-y-auto">

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Libellé <span className="text-error">*</span></label>
                <input className={inputCls} value={form.label} autoFocus
                  onChange={(e) => setField("label", e.target.value)}
                  placeholder="Ex: Diabète type 2, HTA, Asthme…" />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Code CIM-10 (optionnel)</label>
                <SearchSelect<ICD10Result>
                  fetchOptions={fetchICD10Options}
                  value={form.icd10_code}
                  initialLabel={form.icd10_label}
                  onChange={(val, record) => {
                    setField("icd10_code", val as string | null);
                    if (record && !form.label.trim()) {
                      setField("label", record.label_fr);
                    }
                  }}
                  getOptionLabel={(r) => `${r.code} — ${r.label_fr}`}
                  getOptionValue={(r) => r.code}
                  placeholder="Rechercher un code CIM-10…"
                />
                {form.icd10_code && (
                  <button type="button"
                    onClick={() => { setField("icd10_code", null); setField("icd10_label", ""); }}
                    className="self-start text-label-sm text-on-surface-variant hover:text-error underline mt-0.5">
                    Effacer le code
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Statut clinique</label>
                <select className={selectCls} value={form.clinical_status}
                  onChange={(e) => setField("clinical_status", e.target.value as ConditionStatus)}>
                  <option value="ACTIF">Actif</option>
                  <option value="RESOLU">Résolu</option>
                  <option value="INACTIF">Inactif</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Date de début</label>
                  <input type="date" className={inputCls} value={form.onset_date}
                    onChange={(e) => setField("onset_date", e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Date de résolution</label>
                  <input type="date" className={inputCls} value={form.resolved_date}
                    onChange={(e) => setField("resolved_date", e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Notes</label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Informations complémentaires…" />
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
