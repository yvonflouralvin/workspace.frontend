"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  AddOutlined, DeleteOutlined, EditOutlined, WarningAmberOutlined,
} from "@mui/icons-material";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  getPatientAllergies, createAllergy, updateAllergy, removeAllergy,
  searchATCClasses,
  type AllergyRead, type AllergyCreate, type AllergyType, type AllergyCategory,
  type AllergySeverity, type AllergyStatus, type ATCClassResult,
} from "@/app/lib/emr-api";

// ─── Constants ───────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const selectCls = inputCls;
const labelCls = "text-label-md font-medium text-on-surface-variant";

const SEVERITY_WEIGHT: Record<AllergySeverity, number> = { CRITIQUE: 3, SEVERE: 2, MODEREE: 1, LEGERE: 0 };

const SEVERITY_LABEL: Record<AllergySeverity, string> = {
  CRITIQUE: "Critique", SEVERE: "Sévère", MODEREE: "Modérée", LEGERE: "Légère",
};

const SEVERITY_CLS: Record<AllergySeverity, string> = {
  CRITIQUE: "bg-error text-white",
  SEVERE: "bg-error/80 text-white",
  MODEREE: "bg-error-container text-error",
  LEGERE: "bg-surface-container text-on-surface-variant",
};

const CATEGORY_LABEL: Record<AllergyCategory, string> = {
  MEDICAMENT: "Médicament", ALIMENT: "Aliment", ENVIRONNEMENT: "Environnement", AUTRE: "Autre",
};

const STATUS_LABEL: Record<AllergyStatus, string> = {
  ACTIVE: "Active", INACTIVE: "Inactive", RESOLUE: "Résolue",
};

const STATUS_CLS: Record<AllergyStatus, string> = {
  ACTIVE: "bg-secondary/10 text-secondary",
  INACTIVE: "bg-surface-container text-on-surface-variant",
  RESOLUE: "bg-surface-container text-on-surface-variant line-through",
};

// ─── Sorting ─────────────────────────────────────────────────────────────────

function sortAllergies(items: AllergyRead[]): AllergyRead[] {
  return [...items].sort((a, b) => {
    const statusScore = (s: AllergyStatus) => (s === "ACTIVE" ? 1 : 0);
    const byStatus = statusScore(b.clinical_status) - statusScore(a.clinical_status);
    if (byStatus !== 0) return byStatus;
    return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
  });
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  substance: "",
  substance_code: null as string | null,
  type: "ALLERGIE" as AllergyType,
  category: "MEDICAMENT" as AllergyCategory,
  severity: "MODEREE" as AllergySeverity,
  reaction: "",
  clinical_status: "ACTIVE" as AllergyStatus,
};

type AllergyForm = typeof EMPTY_FORM;

function fromItem(item: AllergyRead): AllergyForm {
  return {
    substance: item.substance,
    substance_code: item.substance_code ?? null,
    type: item.type,
    category: item.category,
    severity: item.severity,
    reaction: item.reaction ?? "",
    clinical_status: item.clinical_status,
  };
}

// ─── Form (autonome — réutilisé en RightDrawer ET dans le SplitWorkspace) ───────

function AllergyForm({
  patientId,
  initialData,
  onSaved,
  onClose,
}: {
  patientId: number;
  initialData?: AllergyRead;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<AllergyForm>(initialData ? fromItem(initialData) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function setField<K extends keyof AllergyForm>(key: K, value: AllergyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.substance.trim()) { setFormError("La substance est requise."); return; }
    setSaving(true); setFormError(null);
    try {
      const payload: AllergyCreate = {
        patient_id: patientId,
        substance: form.substance.trim(),
        substance_code: form.category === "MEDICAMENT" ? (form.substance_code || null) : null,
        type: form.type,
        category: form.category,
        severity: form.severity,
        reaction: form.reaction.trim() || null,
        clinical_status: form.clinical_status,
      };
      if (isEdit) {
        const { patient_id: _, ...rest } = payload;
        await updateAllergy(initialData!.id, rest);
      } else {
        await createAllergy(payload);
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col gap-5 overflow-y-auto">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Substance <span className="text-error">*</span></label>
          <input
            className={inputCls}
            value={form.substance}
            onChange={(e) => setField("substance", e.target.value)}
            placeholder="Ex: Pénicilline, Arachide, Pollen…"
            autoFocus
          />
        </div>

        {form.category === "MEDICAMENT" && (
          <div className="flex flex-col gap-1">
            <label className={labelCls}>
              Classe ATC{" "}
              <span className="text-on-surface-variant/50 text-label-sm font-normal">(optionnel — active la détection croisée fiable)</span>
            </label>
            <SearchSelect<ATCClassResult>
              fetchOptions={searchATCClasses}
              value={form.substance_code}
              onChange={(val) => setField("substance_code", val as string | null)}
              getOptionLabel={(r) => `${r.code} · ${r.label_fr}`}
              getOptionValue={(r) => r.code}
              placeholder="Rechercher une classe ATC…"
              initialLabel={form.substance_code ?? undefined}
            />
            {form.substance_code && (
              <button
                type="button"
                onClick={() => setField("substance_code", null)}
                className="text-label-sm text-on-surface-variant hover:text-error transition-colors text-left mt-0.5"
              >
                Retirer le code ATC
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Type</label>
            <select className={selectCls} value={form.type}
              onChange={(e) => setField("type", e.target.value as AllergyType)}>
              <option value="ALLERGIE">Allergie</option>
              <option value="INTOLERANCE">Intolérance</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Catégorie</label>
            <select className={selectCls} value={form.category}
              onChange={(e) => {
                const cat = e.target.value as AllergyCategory;
                setForm((f) => ({ ...f, category: cat, substance_code: cat === "MEDICAMENT" ? f.substance_code : null }));
              }}>
              <option value="MEDICAMENT">Médicament</option>
              <option value="ALIMENT">Aliment</option>
              <option value="ENVIRONNEMENT">Environnement</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Sévérité</label>
            <select className={selectCls} value={form.severity}
              onChange={(e) => setField("severity", e.target.value as AllergySeverity)}>
              <option value="LEGERE">Légère</option>
              <option value="MODEREE">Modérée</option>
              <option value="SEVERE">Sévère</option>
              <option value="CRITIQUE">Critique</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Statut clinique</label>
            <select className={selectCls} value={form.clinical_status}
              onChange={(e) => setField("clinical_status", e.target.value as AllergyStatus)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="RESOLUE">Résolue</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Réaction observée</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            value={form.reaction}
            onChange={(e) => setField("reaction", e.target.value)}
            placeholder="Décrivez la réaction (urticaire, anaphylaxie…)"
          />
        </div>

        {formError && <p className="text-body-sm text-error">{formError}</p>}
      </div>

      <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
        <button type="submit" disabled={saving}
          className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
          {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
        </button>
        <button type="button" onClick={onClose} disabled={saving}
          className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

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

export function AllergiesTab({
  patientId,
  canWrite,
  onMutation,
  onSplit,
  onCloseSplit,
}: {
  patientId: number;
  canWrite: boolean;
  onMutation: () => void;
  onSplit?: (title: string, content: React.ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  const [items, setItems] = useState<AllergyRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<null | { mode: "create" } | { mode: "edit"; item: AllergyRead }>(null);

  const [deleteTarget, setDeleteTarget] = useState<AllergyRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPatientAllergies(patientId)
      .then((res) => setItems(sortAllergies(res)))
      .catch(() => setError("Impossible de charger les allergies."))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  function afterSave() { load(); onMutation(); }

  function openCreate() {
    if (onSplit) {
      onSplit("Nouvelle allergie", (
        <AllergyForm
          patientId={patientId}
          onSaved={() => { afterSave(); onCloseSplit?.(); }}
          onClose={() => onCloseSplit?.()}
        />
      ));
      return;
    }
    setDrawer({ mode: "create" });
  }

  function openEdit(item: AllergyRead) {
    if (onSplit) {
      onSplit(item.substance, (
        <AllergyForm
          patientId={patientId}
          initialData={item}
          onSaved={() => { afterSave(); onCloseSplit?.(); }}
          onClose={() => onCloseSplit?.()}
        />
      ));
      return;
    }
    setDrawer({ mode: "edit", item });
  }

  function closeDrawer() { setDrawer(null); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeAllergy(deleteTarget.id);
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      onMutation();
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
          <h2 className="text-body-md font-semibold text-on-surface">Allergies et intolérances</h2>
          {!loading && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {items.length} entrée{items.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Ajouter
          </button>
        )}
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {/* ── List ── */}
      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <WarningAmberOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucune allergie enregistrée.</p>
          {canWrite && (
            <button type="button" onClick={openCreate}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
              Ajouter une allergie
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant overflow-hidden divide-y divide-outline-variant bg-surface-container-lowest">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-md font-semibold text-on-surface">{item.substance}</span>
                  <span className={`text-label-sm px-2 py-0.5 rounded-full font-medium ${SEVERITY_CLS[item.severity]}`}>
                    {SEVERITY_LABEL[item.severity]}
                  </span>
                  <span className={`text-label-sm px-2 py-0.5 rounded-full ${STATUS_CLS[item.clinical_status]}`}>
                    {STATUS_LABEL[item.clinical_status]}
                  </span>
                  {item.category === "MEDICAMENT" && item.substance_code && (
                    <span className="text-label-sm px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-mono">
                      {item.substance_code}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 flex-wrap text-body-sm text-on-surface-variant">
                  <span>{item.type === "ALLERGIE" ? "Allergie" : "Intolérance"}</span>
                  <span className="text-on-surface-variant/30">·</span>
                  <span>{CATEGORY_LABEL[item.category]}</span>
                  {item.reaction && (
                    <>
                      <span className="text-on-surface-variant/30">·</span>
                      <span className="truncate max-w-xs italic">{item.reaction}</span>
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
        <Modal title="Supprimer l'allergie" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-body-md text-on-surface mb-5">
            Supprimer l&apos;allergie à <strong>{deleteTarget.substance}</strong> ? Cette action est irréversible.
          </p>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
              className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 rounded-xl text-body-md bg-error text-white hover:opacity-90 transition-opacity disabled:opacity-50">
              {deleting ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Drawer (fallback quand onSplit non fourni) ── */}
      {drawer && (
        <RightDrawer
          title={drawer.mode === "create" ? "Nouvelle allergie" : drawer.item.substance}
          onClose={closeDrawer}
        >
          <AllergyForm
            patientId={patientId}
            initialData={drawer.mode === "edit" ? drawer.item : undefined}
            onSaved={() => { closeDrawer(); afterSave(); }}
            onClose={closeDrawer}
          />
        </RightDrawer>
      )}
    </>
  );
}
