"use client";

import { WarningAmberOutlined, InfoOutlined, CheckCircleOutlineOutlined } from "@mui/icons-material";
import type { AllergyRead, AllergySeverity } from "@/app/lib/emr-api";

const SEVERITY_WEIGHT: Record<AllergySeverity, number> = {
  CRITIQUE: 3,
  SEVERE: 2,
  MODEREE: 1,
  LEGERE: 0,
};

const SEVERITY_LABEL: Record<AllergySeverity, string> = {
  CRITIQUE: "critique",
  SEVERE: "sévère",
  MODEREE: "modérée",
  LEGERE: "légère",
};

function maxSeverity(allergies: AllergyRead[]): AllergySeverity | null {
  if (allergies.length === 0) return null;
  return allergies.reduce((max, a) =>
    SEVERITY_WEIGHT[a.severity] > SEVERITY_WEIGHT[max.severity] ? a : max,
  ).severity;
}

export function AllergyBanner({ allergies }: { allergies: AllergyRead[] }) {
  if (allergies.length === 0) {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5"
      >
        <CheckCircleOutlineOutlined style={{ fontSize: 16 }} className="text-on-surface-variant shrink-0" />
        <p className="text-body-sm text-on-surface-variant">Aucune allergie connue.</p>
      </div>
    );
  }

  const top = maxSeverity(allergies)!;
  const isHigh = top === "CRITIQUE" || top === "SEVERE";

  if (isHigh) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-start gap-3 rounded-xl border border-error bg-error-container px-4 py-3"
      >
        <WarningAmberOutlined
          style={{ fontSize: 18 }}
          className="text-error shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-on-error-container">
            Allergies — {allergies.length} allergie{allergies.length > 1 ? "s" : ""} active{allergies.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {allergies.map((a) => (
              <li key={a.id} className="text-body-sm text-on-error-container/90 flex items-center gap-1">
                <span className="font-medium">{a.substance}</span>
                <span className="text-on-error-container/60 text-label-sm">({SEVERITY_LABEL[a.severity]})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3"
    >
      <InfoOutlined style={{ fontSize: 16 }} className="text-on-surface-variant shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-on-surface">
          Allergies — {allergies.length} allergie{allergies.length > 1 ? "s" : ""} active{allergies.length > 1 ? "s" : ""}
        </p>
        <ul className="mt-0.5 flex flex-wrap gap-x-3">
          {allergies.map((a) => (
            <li key={a.id} className="text-body-sm text-on-surface-variant flex items-center gap-1">
              <span>{a.substance}</span>
              <span className="text-on-surface-variant/60 text-label-sm">({SEVERITY_LABEL[a.severity]})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
