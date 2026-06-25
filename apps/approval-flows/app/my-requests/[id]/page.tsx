"use client";

import { use, useEffect, useState } from "react";
import {
  CheckCircleOutlined,
  CancelOutlined,
  HourglassEmptyOutlined,
  RadioButtonUncheckedOutlined,
} from "@mui/icons-material";
import { Badge } from "@repo/ui/Badge";
import { STATUS_LABEL } from "@repo/approval-flows/ApprovalTaskList";
import type { RequestDetail, RequestFieldInfo, DecisionOut } from "@repo/approval-flows/types/request";
import { DashboardShell } from "@/components/DashboardShell";
import { getRequest, ApiError } from "@/app/lib/api";

const STATUS_COLOR: Record<string, string> = {
  pending: "#004598",
  needs_update: "#9a6700",
  approved: "#006c49",
  rejected: "#ba1a1a",
};

function isRestricted(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as Record<string, unknown>).__restricted__ === true;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function fieldLabel(fields: RequestFieldInfo[], key: string): string {
  return fields.find((f) => f.key === key)?.label ?? key;
}

function fieldType(fields: RequestFieldInfo[], key: string): string | undefined {
  return fields.find((f) => f.key === key)?.type;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRequest(id)
      .then(setRequest)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading && <p className="text-sm text-on-surface-variant">Chargement…</p>}

        {!loading && request && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-on-surface">{request.flow_title}</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  Soumise le {formatDateTime(request.created_at)}
                </p>
              </div>
              <Badge color={STATUS_COLOR[request.status]}>
                {STATUS_LABEL[request.status] ?? request.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-on-surface">Champs soumis</h2>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-2">
                {Object.entries(request.field_values).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between px-4 py-2.5 text-sm border-b border-outline-variant last:border-b-0"
                  >
                    <span className="text-on-surface-variant">{fieldLabel(request.fields, key)}</span>
                    <span className="text-on-surface font-medium">
                      {isRestricted(value) ? (
                        "🔒 Information restreinte"
                      ) : fieldType(request.fields, key) === "attachment" && value ? (
                        <a
                          href={`/api/approval-flows/requests/${request.id}/attachments/${value}`}
                          className="text-primary hover:underline"
                        >
                          Télécharger la pièce jointe
                        </a>
                      ) : (
                        formatValue(value)
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-on-surface">Historique et avancement</h2>
              <div className="space-y-3">
                {request.steps.map((step) => {
                  // `decisions` est trié par décidé_at croissant (relation SQLAlchemy) —
                  // la dernière entrée reflète l'état actuel du step, y compris après un
                  // rejet "soft" (needs_update) suivi d'une resoumission re-décidée.
                  const decisions = request.decisions.filter((d) => d.step_order === step.order);
                  const latest = decisions[decisions.length - 1];
                  const isCurrent = step.order === request.current_step_order && request.status === "pending";
                  const isFuture = decisions.length === 0 && !isCurrent;

                  return (
                    <div key={step.step_key} className="flex gap-3">
                      <div className="pt-0.5">
                        {latest?.decision === "reject" ? (
                          <CancelOutlined style={{ fontSize: 20 }} className="text-error" />
                        ) : latest?.decision === "approve" ? (
                          <CheckCircleOutlined style={{ fontSize: 20 }} className="text-[#006c49]" />
                        ) : isCurrent ? (
                          <HourglassEmptyOutlined style={{ fontSize: 20 }} className="text-[#004598]" />
                        ) : (
                          <RadioButtonUncheckedOutlined style={{ fontSize: 20 }} className="text-on-surface-variant" />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-sm font-medium text-on-surface">{step.name}</p>
                        {decisions.length > 0 ? (
                          <div className="space-y-1 mt-1">
                            {decisions.map((decision: DecisionOut, i) => (
                              <p key={i} className="text-xs text-on-surface-variant">
                                {`${decision.decision === "approve" ? "Approuvée" : "Rejetée"} par ${decision.decided_by_name ?? `l'utilisateur #${decision.decided_by}`} le ${formatDateTime(decision.decided_at)}`}
                                {decision.comment && ` — « ${decision.comment} »`}
                              </p>
                            ))}
                          </div>
                        ) : isCurrent ? (
                          <p className="text-xs text-on-surface-variant mt-1">En attente de décision.</p>
                        ) : isFuture ? (
                          <p className="text-xs text-on-surface-variant mt-1">À venir.</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
