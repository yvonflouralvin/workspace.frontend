"use client";
import { useRef, useState } from "react";
import {
  createNote, updateNote, amendNote,
  getEncounterById, getPatientEncounters, createEncounter,
  type ClinicalNoteRead, type ClinicalNoteUpdate, type EncounterRead,
} from "@/app/lib/emr-api";

const inputCls = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors resize-none";
const labelCls = "text-label-md font-medium text-on-surface-variant";

const SOAP_FIELDS: Array<{ key: keyof ClinicalNoteUpdate; label: string; hint: string; rows: number }> = [
  { key: "subjective", label: "S — Subjectif", hint: "Ce que le patient rapporte : motif, plaintes, antécédents pertinents.", rows: 4 },
  { key: "objective",  label: "O — Objectif",  hint: "Examen clinique, constantes, résultats d'examens.", rows: 4 },
  { key: "assessment", label: "A — Évaluation", hint: "Diagnostic principal, hypothèses diagnostiques, évolution.", rows: 3 },
  { key: "plan",       label: "P — Plan",       hint: "Conduite à tenir : traitements, examens complémentaires, suivi.", rows: 3 },
];

type SoapForm = { subjective: string; objective: string; assessment: string; plan: string };
const EMPTY: SoapForm = { subjective: "", objective: "", assessment: "", plan: "" };

export function NoteForm({
  patientId,
  encounterId,
  mode,
  initialData,
  onSaved,
  onClose,
}: {
  patientId: number;
  encounterId?: number;
  mode: "create" | "edit" | "amend";
  initialData?: ClinicalNoteRead;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SoapForm>(() =>
    mode === "create"
      ? EMPTY
      : {
          subjective: initialData?.subjective ?? "",
          objective:  initialData?.objective  ?? "",
          assessment: initialData?.assessment ?? "",
          plan:       initialData?.plan       ?? "",
        },
  );
  const [saving, setSaving] = useState(false);
  const [encounterLoading, setEncounterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLTextAreaElement>(null);

  function setField(key: keyof SoapForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function resolveEncounter(): Promise<EncounterRead> {
    if (encounterId !== undefined) return getEncounterById(encounterId);
    setEncounterLoading(true);
    try {
      const { items } = await getPatientEncounters(patientId, { per_page: 10 });
      const ongoing = items.find((e: EncounterRead) => e.status === "EN_COURS");
      if (ongoing) return ongoing;
      return await createEncounter({ patient_id: patientId, type: "CONSULTATION", status: "EN_COURS" });
    } finally {
      setEncounterLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const enc = await resolveEncounter();
        await createNote({
          patient_id: patientId,
          encounter_id: enc.id,
          subjective: form.subjective || null,
          objective:  form.objective  || null,
          assessment: form.assessment || null,
          plan:       form.plan       || null,
        });
      } else if (mode === "edit" && initialData) {
        await updateNote(initialData.id, {
          subjective: form.subjective || null,
          objective:  form.objective  || null,
          assessment: form.assessment || null,
          plan:       form.plan       || null,
        });
      } else if (mode === "amend" && initialData) {
        await amendNote(initialData.id, {
          subjective: form.subjective || null,
          objective:  form.objective  || null,
          assessment: form.assessment || null,
          plan:       form.plan       || null,
        });
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const modeLabel =
    mode === "create" ? "Nouvelle note SOAP"
    : mode === "amend" ? "Addendum"
    : "Modifier la note";

  return (
    <form onSubmit={handleSave} className="h-full flex flex-col min-h-0">
      <div className="shrink-0 px-6 py-3 border-b border-outline-variant bg-surface-container-low/40">
        <p className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">{modeLabel}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {encounterLoading && (
          <p className="text-body-sm text-on-surface-variant">Détermination de la consultation…</p>
        )}

        {SOAP_FIELDS.map((f, i) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className={labelCls}>{f.label}</label>
            <p className="text-label-sm text-on-surface-variant/70 -mt-0.5">{f.hint}</p>
            <textarea
              ref={i === 0 ? firstRef : undefined}
              className={inputCls}
              rows={f.rows}
              value={form[f.key as keyof SoapForm]}
              onChange={(e) => setField(f.key as keyof SoapForm, e.target.value)}
            />
          </div>
        ))}

        {error && <p className="text-body-sm text-error">{error}</p>}
      </div>

      <div className="shrink-0 flex gap-3 px-6 py-4 border-t border-outline-variant">
        <button
          type="submit"
          disabled={saving || encounterLoading}
          className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : mode === "create" ? "Créer la note" : mode === "amend" ? "Ajouter l'addendum" : "Enregistrer"}
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
