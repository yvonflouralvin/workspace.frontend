"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  AddOutlined, DeleteOutlined, EditOutlined, HistoryEduOutlined,
} from "@mui/icons-material";
import {
  getPatientHistory, createHistory, updateHistory, removeHistory,
  type MedicalHistoryRead, type HistoryCreate, type HistoryCategory,
} from "@/app/lib/emr-api";

// ─── Constants ───────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const selectCls = inputCls;
const labelCls = "text-label-md font-medium text-on-surface-variant";

const CATEGORIES: HistoryCategory[] = ["MEDICAL", "CHIRURGICAL", "FAMILIAL", "GYNECO_OBSTETRIQUE"];

const CATEGORY_LABEL: Record<HistoryCategory, string> = {
  MEDICAL: "Antécédents médicaux",
  CHIRURGICAL: "Antécédents chirurgicaux",
  FAMILIAL: "Antécédents familiaux",
  GYNECO_OBSTETRIQUE: "Gynéco-obstétrique",
};

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  category: "MEDICAL" as HistoryCategory,
  title: "",
  date_approximative: "",
  active: true,
};

type HistoryForm = typeof EMPTY_FORM;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-outline-variant overflow-hidden">
          <div className="h-10 bg-surface-container-low animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-2/3 rounded bg-surface-container animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HistoryTab({
  patientId,
  canWrite,
  onMutation,
}: {
  patientId: number;
  canWrite: boolean;
  onMutation?: () => void;
}) {
  const [items, setItems] = useState<MedicalHistoryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<null | { mode: "create"; defaultCategory?: HistoryCategory } | { mode: "edit"; item: MedicalHistoryRead }>(null);
  const [form, setForm] = useState<HistoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MedicalHistoryRead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPatientHistory(patientId)
      .then(setItems)
      .catch(() => setError("Impossible de charger les antécédents."))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  function openCreate(defaultCategory?: HistoryCategory) {
    setForm({ ...EMPTY_FORM, category: defaultCategory ?? "MEDICAL" });
    setFormError(null);
    setDrawer({ mode: "create", defaultCategory });
  }

  function openEdit(item: MedicalHistoryRead) {
    setForm({
      category: item.category as HistoryCategory,
      title: item.title,
      date_approximative: item.date_approximative ?? "",
      active: item.active,
    });
    setFormError(null);
    setDrawer({ mode: "edit", item });
  }

  function closeDrawer() { setDrawer(null); setFormError(null); }

  function setField<K extends keyof HistoryForm>(key: K, value: HistoryForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("L'intitulé est requis."); return; }
    setSaving(true); setFormError(null);
    try {
      const payload: HistoryCreate = {
        patient_id: patientId,
        category: form.category,
        title: form.title.trim(),
        date_approximative: form.date_approximative.trim() || null,
        active: form.active,
      };
      if (drawer?.mode === "create") {
        await createHistory(payload);
      } else if (drawer?.mode === "edit") {
        const { patient_id: _, ...rest } = payload;
        await updateHistory(drawer.item.id, rest);
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
      await removeHistory(deleteTarget.id);
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
      onMutation?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer.");
    } finally {
      setDeleting(false);
    }
  }

  const totalCount = items.length;

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-body-md font-semibold text-on-surface">Antécédents</h2>
          {!loading && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {totalCount} entrée{totalCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {canWrite && (
          <button type="button" onClick={() => openCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 18 }} />
            Ajouter
          </button>
        )}
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {loading ? (
        <Skeleton />
      ) : totalCount === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <HistoryEduOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucun antécédent enregistré.</p>
          {canWrite && (
            <button type="button" onClick={() => openCreate()}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity">
              Ajouter un antécédent
            </button>
          )}
        </div>
      ) : (
        // ── Sections by category ──
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="rounded-2xl border border-outline-variant overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-3 bg-surface-container-low border-b border-outline-variant">
                  <h3 className="text-body-md font-semibold text-on-surface">{CATEGORY_LABEL[cat]}</h3>
                  {canWrite && (
                    <button type="button" onClick={() => openCreate(cat)}
                      className="inline-flex items-center gap-1 text-label-sm text-primary hover:opacity-70 transition-opacity">
                      <AddOutlined style={{ fontSize: 14 }} />
                      Ajouter
                    </button>
                  )}
                </div>
                <div className="divide-y divide-outline-variant bg-surface-container-lowest">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-body-md font-medium ${item.active ? "text-on-surface" : "text-on-surface-variant line-through"}`}>
                            {item.title}
                          </span>
                          {!item.active && (
                            <span className="text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                              Résolu
                            </span>
                          )}
                        </div>
                        {item.date_approximative && (
                          <p className="text-body-sm text-on-surface-variant mt-0.5 italic">
                            {item.date_approximative}
                          </p>
                        )}
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
              </div>
            );
          })}

          {/* Empty categories — show only if we have at least 1 item total (to avoid noise) */}
          {CATEGORIES.filter((cat) => items.filter((i) => i.category === cat).length === 0).length > 0 && canWrite && (
            <p className="text-body-sm text-on-surface-variant text-center pt-2">
              Catégories sans entrée masquées.{" "}
              <button type="button" onClick={() => openCreate()}
                className="text-primary underline underline-offset-2 hover:opacity-70">
                Ajouter dans une catégorie…
              </button>
            </p>
          )}
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <Modal title="Supprimer l'antécédent" onClose={() => !deleting && setDeleteTarget(null)}>
          <p className="text-body-md text-on-surface mb-5">
            Supprimer <strong>{deleteTarget.title}</strong> des antécédents ?
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
          title={drawer.mode === "create" ? "Nouvel antécédent" : drawer.mode === "edit" ? "Modifier l'antécédent" : ""}
          onClose={closeDrawer}
        >
          <form onSubmit={handleSubmit} className="h-full flex flex-col gap-5 overflow-y-auto">
            <div className="flex-1 space-y-4 overflow-y-auto">

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Catégorie</label>
                <select className={selectCls} value={form.category}
                  onChange={(e) => setField("category", e.target.value as HistoryCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Intitulé <span className="text-error">*</span></label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.title} autoFocus
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Ex: Appendicite opérée en 1998, Diabète de type 2 chez le père…" />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Date approximative</label>
                <input className={inputCls} value={form.date_approximative}
                  onChange={(e) => setField("date_approximative", e.target.value)}
                  placeholder="Ex: vers 2010, enfance, 1985…" />
                <p className="text-label-sm text-on-surface-variant/60">Texte libre — pas un calendrier.</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                <span className={labelCls}>Toujours actif / pertinent</span>
              </label>

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
