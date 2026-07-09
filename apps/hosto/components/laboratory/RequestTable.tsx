"use client";

import type { LabRequest } from "@/app/lib/lab-api";

const STATUS_BADGE: Record<string, string> = {
  DEMANDE:               "bg-blue-100 text-blue-700",
  PARTIELLEMENT_PRELEVE: "bg-amber-100 text-amber-800",
  PRELEVE:               "bg-yellow-100 text-yellow-800",
  EN_ANALYSE:            "bg-orange-100 text-orange-800",
  VALIDE:                "bg-green-100 text-green-800",
  ANNULE:                "bg-surface-container text-on-surface-variant",
};

const STATUS_LABEL: Record<string, string> = {
  DEMANDE:               "Demandé",
  PARTIELLEMENT_PRELEVE: "Part. prélevé",
  PRELEVE:               "Prélevé",
  EN_ANALYSE:            "En analyse",
  VALIDE:                "Validé",
  ANNULE:                "Annulé",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function RequestTable({
  rows,
  actionLabel,
  actionDisabled,
  onAction,
  emptyMessage,
}: {
  rows: LabRequest[];
  actionLabel: string;
  actionDisabled?: boolean;
  onAction: (req: LabRequest) => void;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-10 text-center text-body-sm text-on-surface-variant">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-x-auto">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-outline-variant text-left text-on-surface-variant">
            <th className="px-4 py-3 font-medium">Patient</th>
            <th className="px-4 py-3 font-medium">Examens</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium text-right">Heure</th>
            <th className="px-4 py-3 font-medium w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((req) => {
            const isUrgent = req.priority === "URGENT";
            return (
              <tr
                key={req.id}
                onClick={() => !actionDisabled && onAction(req)}
                className={`border-b border-outline-variant last:border-0 transition-colors ${
                  actionDisabled ? "" : "hover:bg-surface-container-low cursor-pointer"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isUrgent ? "bg-error" : "bg-secondary"}`} />
                    <div className="min-w-0">
                      <p className="text-on-surface font-medium truncate">
                        {req.patient?.prenom} {req.patient?.nom}
                      </p>
                      <p className="text-label-sm text-on-surface-variant">{req.patient?.dossier_number}</p>
                    </div>
                    {isUrgent && (
                      <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-error/10 text-error font-medium shrink-0">
                        URGENT
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant max-w-[300px]">
                  <span className="line-clamp-2">{req.items.map((i) => i.lab_test_name_cache).join(", ")}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-label-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[req.status] ?? ""}`}>
                    {STATUS_LABEL[req.status] ?? req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-on-surface-variant/70 tabular-nums whitespace-nowrap">
                  {formatTime(req.requested_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  {!actionDisabled && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAction(req); }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-label-md font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      {actionLabel}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
