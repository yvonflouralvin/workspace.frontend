"use client";

import type { LabRequest, LabResultValue } from "@/app/lib/lab-api";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function FlagBadge({ flag }: { flag: string }) {
  if (flag === "NORMAL") return null;
  if (flag === "BAS")
    return <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-semibold">↓ BAS</span>;
  if (flag === "HAUT")
    return <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-error-container text-error font-semibold">↑ HAUT</span>;
  if (flag === "CRITIQUE")
    return <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-error text-on-error font-bold">!! CRITIQUE</span>;
  return <span className="text-label-xs text-on-surface-variant/60">—</span>;
}

export function ResultValueRow({ v }: { v: LabResultValue }) {
  const isAbnormal = v.abnormal;
  return (
    <div className={`flex items-start gap-3 rounded-lg px-3 py-2 ${isAbnormal ? "bg-error-container/20" : "bg-surface-container-lowest"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-on-surface">{v.parameter_name_cache}</p>
        <p className={`text-body-md font-semibold tabular-nums ${isAbnormal ? "text-error" : "text-on-surface"}`}>
          {v.value_numeric !== null ? v.value_numeric : v.value_text ?? "—"}
          {v.unit_cache && <span className="text-label-sm font-normal text-on-surface-variant ml-1">{v.unit_cache}</span>}
        </p>
        {v.reference_used && (
          <p className="text-label-sm text-on-surface-variant/60 mt-0.5">Réf : {v.reference_used}</p>
        )}
      </div>
      <FlagBadge flag={v.interpretation} />
    </div>
  );
}

export function ContextSnapshotCard({ req }: { req: LabRequest }) {
  const items: { label: string; value: string }[] = [];
  if (req.patient_age_years_at_collection !== null)
    items.push({ label: "Âge", value: `${req.patient_age_years_at_collection} ans` });
  if (req.patient_sex_at_collection)
    items.push({ label: "Sexe", value: req.patient_sex_at_collection });
  if (req.patient_weight_at_collection !== null)
    items.push({ label: "Poids", value: `${req.patient_weight_at_collection} kg` });
  if (req.patient_height_at_collection !== null)
    items.push({ label: "Taille", value: `${req.patient_height_at_collection} cm` });
  if (req.patient_systolic_at_collection !== null && req.patient_diastolic_at_collection !== null)
    items.push({ label: "TA", value: `${req.patient_systolic_at_collection}/${req.patient_diastolic_at_collection} mmHg` });
  if (req.patient_temperature_at_collection !== null)
    items.push({ label: "Temp.", value: `${req.patient_temperature_at_collection} °C` });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
        <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide mb-1">Contexte au prélèvement</p>
        <p className="text-body-sm text-on-surface-variant/60 italic">Aucune constante enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
      <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide mb-2">Contexte au prélèvement</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <span key={item.label} className="text-body-sm text-on-surface">
            <span className="text-on-surface-variant">{item.label} : </span>{item.value}
          </span>
        ))}
      </div>
    </div>
  );
}
