"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { collectSample, type LabRequest, type CollectContextValues } from "@/app/lib/lab-api";

export function CollectDrawer({
  req,
  onClose,
  onDone,
}: {
  req: LabRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [weight, setWeight] = useState(req.patient_weight_at_collection !== null ? String(req.patient_weight_at_collection) : "");
  const [height, setHeight] = useState(req.patient_height_at_collection !== null ? String(req.patient_height_at_collection) : "");
  const [systolic, setSystolic] = useState(req.patient_systolic_at_collection !== null ? String(req.patient_systolic_at_collection) : "");
  const [diastolic, setDiastolic] = useState(req.patient_diastolic_at_collection !== null ? String(req.patient_diastolic_at_collection) : "");
  const [temperature, setTemperature] = useState(req.patient_temperature_at_collection !== null ? String(req.patient_temperature_at_collection) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const ctx: CollectContextValues = {};
      if (weight.trim()) ctx.weight_kg = parseFloat(weight);
      if (height.trim()) ctx.height_cm = parseFloat(height);
      if (systolic.trim()) ctx.systolic_mmhg = parseFloat(systolic);
      if (diastolic.trim()) ctx.diastolic_mmhg = parseFloat(diastolic);
      if (temperature.trim()) ctx.temperature_c = parseFloat(temperature);
      await collectSample(req.id, ctx);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du prélèvement.");
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { label: "Poids (kg)", value: weight, onChange: setWeight },
    { label: "Taille (cm)", value: height, onChange: setHeight },
    { label: "TA systolique (mmHg)", value: systolic, onChange: setSystolic },
    { label: "TA diastolique (mmHg)", value: diastolic, onChange: setDiastolic },
    { label: "Température (°C)", value: temperature, onChange: setTemperature },
  ];

  return (
    <RightDrawer
      title={`Prélèvement — ${req.patient?.prenom} ${req.patient?.nom}`}
      onClose={onClose}
      width="w-[480px] max-w-full"
      contentClassName="px-6 py-5 overflow-y-auto space-y-5">

      <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
        <p className="text-label-sm font-medium text-on-surface-variant mb-1">Examens demandés</p>
        <p className="text-body-sm text-on-surface">{req.items.map((i) => i.lab_test_name_cache).join(" · ")}</p>
        {req.clinical_info && (
          <p className="text-body-sm text-on-surface-variant italic mt-1">{req.clinical_info}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide mb-2">Constantes au prélèvement</p>
          <p className="text-body-sm text-on-surface-variant/70 mb-3">
            Ces valeurs seront figées avec le prélèvement et utilisées pour l&apos;interprétation des résultats.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="text-label-md text-on-surface-variant font-medium block mb-1">{label}</label>
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="—"
                  className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary" />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
            {saving ? "Enregistrement…" : "Confirmer le prélèvement"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
