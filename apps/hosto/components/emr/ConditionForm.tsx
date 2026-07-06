"use client";
import { useState } from "react";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  createCondition, updateCondition, searchICD10,
  type ConditionRead, type ConditionCreate, type ConditionStatus, type ICD10Result,
} from "@/app/lib/emr-api";

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

async function fetchICD10Options(q: string): Promise<ICD10Result[]> {
  return searchICD10(q);
}

const EMPTY: {
  label: string;
  icd10_code: string | null;
  icd10_label: string;
  clinical_status: ConditionStatus;
  onset_date: string;
  resolved_date: string;
  notes: string;
} = {
  label: "",
  icd10_code: null,
  icd10_label: "",
  clinical_status: "ACTIF",
  onset_date: "",
  resolved_date: "",
  notes: "",
};

type CF = typeof EMPTY;

export function ConditionForm({
  patientId,
  encounterId,
  initialData,
  onSaved,
  onClose,
}: {
  patientId: number;
  encounterId?: number;
  initialData?: ConditionRead;
  onSaved: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState<CF>(() =>
    initialData
      ? {
          label: initialData.label,
          icd10_code: initialData.icd10_code ?? null,
          icd10_label: initialData.icd10_code ?? "",
          clinical_status: initialData.clinical_status,
          onset_date: initialData.onset_date ? initialData.onset_date.slice(0, 10) : "",
          resolved_date: initialData.resolved_date ? initialData.resolved_date.slice(0, 10) : "",
          notes: initialData.notes ?? "",
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CF>(key: K, value: CF[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) { setError("Le libellé est requis."); return; }
    setSaving(true);
    setError(null);
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
      if (isEdit && initialData) {
        const { patient_id: _, ...rest } = payload;
        await updateCondition(initialData.id, rest);
      } else {
        await createCondition(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Libellé <span className="text-error">*</span></label>
          <input
            className={inputCls}
            value={form.label}
            autoFocus
            onChange={(e) => set("label", e.target.value)}
            placeholder="Ex: Diabète type 2, HTA, Asthme…"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Code CIM-10 (optionnel)</label>
          <SearchSelect<ICD10Result>
            fetchOptions={fetchICD10Options}
            value={form.icd10_code}
            initialLabel={form.icd10_label}
            onChange={(val, record) => {
              set("icd10_code", val as string | null);
              if (record && !form.label.trim()) set("label", record.label_fr);
            }}
            getOptionLabel={(r) => `${r.code} — ${r.label_fr}`}
            getOptionValue={(r) => r.code}
            placeholder="Rechercher un code CIM-10…"
          />
          {form.icd10_code && (
            <button
              type="button"
              onClick={() => { set("icd10_code", null); set("icd10_label", ""); }}
              className="self-start text-label-sm text-on-surface-variant hover:text-error underline mt-0.5"
            >
              Effacer le code
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Statut clinique</label>
          <select
            className={inputCls}
            value={form.clinical_status}
            onChange={(e) => set("clinical_status", e.target.value as ConditionStatus)}
          >
            <option value="ACTIF">Actif</option>
            <option value="RESOLU">Résolu</option>
            <option value="INACTIF">Inactif</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Date de début</label>
            <input type="date" className={inputCls} value={form.onset_date}
              onChange={(e) => set("onset_date", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Date de résolution</label>
            <input type="date" className={inputCls} value={form.resolved_date}
              onChange={(e) => set("resolved_date", e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Notes</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={4}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Informations complémentaires…"
          />
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}
      </div>

      <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-outline-variant">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
