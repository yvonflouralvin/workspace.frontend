"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { collectSample, type LabRequest, type CollectContextValues } from "@/app/lib/lab-api";
import { getLatestObservations, type ObservationRead } from "@/app/lib/emr-api";

function extractContext(obs: ObservationRead[]): CollectContextValues {
  const find = (code: ObservationRead["code"]) => obs.find((o) => o.code === code)?.value;
  return {
    weight_kg:      find("POIDS"),
    height_cm:      find("TAILLE"),
    systolic_mmhg:  find("TA_SYSTOLIQUE"),
    diastolic_mmhg: find("TA_DIASTOLIQUE"),
    temperature_c:  find("TEMPERATURE"),
  };
}

const VITAL_LABELS: Record<string, string> = {
  weight_kg:      "Poids",
  height_cm:      "Taille",
  systolic_mmhg:  "TA systolique",
  diastolic_mmhg: "TA diastolique",
  temperature_c:  "Température",
};

const VITAL_UNITS: Record<string, string> = {
  weight_kg:      "kg",
  height_cm:      "cm",
  systolic_mmhg:  "mmHg",
  diastolic_mmhg: "mmHg",
  temperature_c:  "°C",
};

export function CollectDrawer({
  req,
  onClose,
  onDone,
}: {
  req: LabRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [context, setContext]       = useState<CollectContextValues>({});
  const [obsLoading, setObsLoading] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    getLatestObservations(req.patient_id)
      .then((obs) => setContext(extractContext(obs)))
      .catch(() => setContext({}))
      .finally(() => setObsLoading(false));
  }, [req.patient_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await collectSample(req.id, context);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du prélèvement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer
      title={`Prélèvement — ${req.patient?.prenom} ${req.patient?.nom}`}
      onClose={onClose}
      width="w-[480px] max-w-full"
      contentClassName="px-6 py-5 overflow-y-auto space-y-5"
    >
      <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
        <p className="text-label-sm font-medium text-on-surface-variant mb-1">Examens demandés</p>
        <p className="text-body-sm text-on-surface">{req.items.map((i) => i.lab_test_name_cache).join(" · ")}</p>
        {req.clinical_info && (
          <p className="text-body-sm text-on-surface-variant italic mt-1">{req.clinical_info}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide mb-1">
            Constantes au prélèvement
          </p>
          <p className="text-body-sm text-on-surface-variant/70 mb-3">
            Constantes copiées depuis le dernier relevé infirmier du dossier médical.
          </p>

          {obsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 rounded-xl bg-surface-container animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant/50 overflow-hidden">
              {(Object.entries(VITAL_LABELS) as [keyof CollectContextValues, string][]).map(([key, label]) => {
                const val = context[key];
                return (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-body-sm text-on-surface-variant">{label}</span>
                    <span className={`text-body-sm font-medium ${val !== undefined ? "text-on-surface" : "text-on-surface-variant/40"}`}>
                      {val !== undefined ? `${val} ${VITAL_UNITS[key]}` : "—"}
                    </span>
                  </div>
                );
              })}
              {Object.values(context).every((v) => v === undefined) && (
                <div className="px-4 py-2.5 text-body-sm text-on-surface-variant/60 italic">
                  Aucune constante enregistrée dans le dossier.
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || obsLoading}
            className="flex-1 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {saving ? "Enregistrement…" : "Confirmer le prélèvement"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
