"use client";

import type { LabRequest } from "@/app/lib/lab-api";

const STATUS_BADGE: Record<string, string> = {
  DEMANDE:    "bg-tertiary/10 text-tertiary",
  PRELEVE:    "bg-locked-container text-locked",
  EN_ANALYSE: "bg-[#ffe6d0] text-[#8a3d12]",
  VALIDE:     "bg-secondary/15 text-secondary",
  ANNULE:     "bg-surface-container text-on-surface-variant",
};

const STATUS_LABEL: Record<string, string> = {
  DEMANDE:    "Demandé",
  PRELEVE:    "Prélevé",
  EN_ANALYSE: "En analyse",
  VALIDE:     "Validé",
  ANNULE:     "Annulé",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function RequestCard({
  req,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  req: LabRequest;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  const isUrgent = req.priority === "URGENT";
  return (
    <div className={`bg-surface rounded-2xl border px-5 py-4 space-y-2 ${isUrgent ? "border-error/40" : "border-outline-variant"}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${isUrgent ? "bg-error" : "bg-secondary"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-sm font-semibold text-on-surface">
              {req.patient?.prenom} {req.patient?.nom}
            </span>
            <span className="text-label-xs text-on-surface-variant">{req.patient?.dossier_number}</span>
            {isUrgent && (
              <span className="text-label-xs px-2 py-0.5 rounded-full bg-error/10 text-error font-medium">URGENT</span>
            )}
            <span className={`text-label-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[req.status] ?? ""}`}>
              {STATUS_LABEL[req.status] ?? req.status}
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            {req.items.map((i) => i.lab_test_name_cache).join(", ")}
          </p>
          {req.clinical_info && (
            <p className="text-body-sm text-on-surface-variant/70 italic mt-0.5">{req.clinical_info}</p>
          )}
          <p className="text-label-sm text-on-surface-variant/60 mt-1">{formatTime(req.requested_at)}</p>
        </div>
        {!actionDisabled && (
          <button
            onClick={onAction}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-tertiary text-on-primary text-body-sm font-semibold hover:bg-tertiary-container transition-colors">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
