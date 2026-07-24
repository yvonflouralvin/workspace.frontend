"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  collectLabItem,
  type LabRequest,
  type LabRequestItem,
  type CollectContextValues,
} from "@/app/lib/lab-api";
import { getLatestObservations, type ObservationRead } from "@/app/lib/emr-api";
import { CheckCircleOutlined, LockOutlined, ScienceOutlined } from "@mui/icons-material";

function extractContext(obs: ObservationRead[]): CollectContextValues {
  const find = (code: ObservationRead["code"]) => obs.find((o) => o.code === code)?.value;
  return {
    weight_kg: find("POIDS"),
    height_cm: find("TAILLE"),
    systolic_mmhg: find("TA_SYSTOLIQUE"),
    diastolic_mmhg: find("TA_DIASTOLIQUE"),
    temperature_c: find("TEMPERATURE"),
  };
}

const VITALS: [keyof CollectContextValues, string, string][] = [
  ["weight_kg", "Poids", "kg"],
  ["height_cm", "Taille", "cm"],
  ["systolic_mmhg", "TA sys.", "mmHg"],
  ["diastolic_mmhg", "TA dia.", "mmHg"],
  ["temperature_c", "T°", "°C"],
];

export function CollectDrawer({
  req,
  onClose,
  onDone,
}: {
  req: LabRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [items, setItems] = useState<LabRequestItem[]>(req.items);
  const [context, setContext] = useState<CollectContextValues>({});
  const [obsLoading, setObsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLatestObservations(req.patient_id)
      .then((obs) => setContext(extractContext(obs)))
      .catch(() => setContext({}))
      .finally(() => setObsLoading(false));
  }, [req.patient_id]);

  async function collectOne(itemId: number) {
    setBusyId(itemId);
    setError(null);
    try {
      const updated = await collectLabItem(itemId, context);
      setItems(updated.items);
      setDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du prélèvement.");
    } finally {
      setBusyId(null);
    }
  }

  function close() {
    if (dirty) onDone();
    else onClose();
  }

  return (
    <RightDrawer
      title={`Prélèvement — ${req.patient?.prenom} ${req.patient?.nom}`}
      onClose={close}
      width="md:w-[560px] md:max-w-[92vw]"
      contentClassName="px-6 py-5 overflow-y-auto space-y-5"
    >
      {req.clinical_info && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
          <p className="text-label-sm font-medium text-on-surface-variant mb-1">Renseignement clinique</p>
          <p className="text-body-sm text-on-surface italic">{req.clinical_info}</p>
        </div>
      )}

      {/* Constantes (figées au 1er prélèvement) */}
      <div className="rounded-xl border border-outline-variant px-4 py-3">
        <p className="text-label-md font-medium text-on-surface-variant mb-2">Constantes au prélèvement</p>
        {obsLoading ? (
          <div className="h-5 rounded bg-surface-container animate-pulse w-2/3" />
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
            {VITALS.map(([key, label, unit]) => (
              <span key={key} className="text-on-surface-variant">
                {label}:{" "}
                <span className={context[key] !== undefined ? "text-on-surface font-medium" : "text-on-surface-variant/40"}>
                  {context[key] !== undefined ? `${context[key]} ${unit}` : "—"}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{error}</p>}

      {/* Tableau des examens */}
      <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant overflow-hidden">
        {items.map((it) => {
          const collected = it.status !== "EN_ATTENTE";
          const unpaid = it.paiement_status !== "PAYE";
          return (
            <div key={it.id} className="flex items-center gap-3 px-4 py-3">
              <ScienceOutlined style={{ fontSize: 18 }} className="text-on-surface-variant/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-on-surface font-medium truncate">{it.lab_test_name_cache}</p>
                {unpaid && !collected && (
                  <p className="text-label-sm text-error/80 flex items-center gap-1">
                    <LockOutlined style={{ fontSize: 12 }} /> Paiement requis
                  </p>
                )}
              </div>
              {collected ? (
                <span className="inline-flex items-center gap-1 text-label-sm font-medium text-secondary shrink-0">
                  <CheckCircleOutlined style={{ fontSize: 16 }} /> Prélevé
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => collectOne(it.id)}
                  disabled={unpaid || busyId === it.id}
                  title={unpaid ? "Paiement requis" : undefined}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {busyId === it.id ? "…" : "Prélever"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={close}
          className="px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          Fermer
        </button>
      </div>
    </RightDrawer>
  );
}
