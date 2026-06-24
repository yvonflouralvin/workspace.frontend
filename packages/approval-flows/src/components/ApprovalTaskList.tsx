// packages/approval-flows/components/ApprovalTaskList.tsx
//
// "Mes tâches" (mode="tasks", approbateur courant) ou "mes soumissions"
// (mode="submissions") — `basePath` doit pointer vers le proxy BFF de l'app hôte.

"use client";

import { useState } from "react";
import { useApprovalTasks } from "../hooks/useApprovalTasks.js";
import { decideRequest } from "../api/client.js";

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Rejetée",
  needs_update: "À mettre à jour",
  cancelled: "Annulée",
};

export function ApprovalTaskList({
  mode = "tasks",
  basePath,
}: {
  mode?: "tasks" | "submissions";
  basePath?: string;
}) {
  const { items, loading, error, refetch } = useApprovalTasks(mode, basePath);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideError, setDecideError] = useState<string | null>(null);

  async function handleDecide(requestId: string, decision: "approve" | "reject") {
    setDecideError(null);
    setDecidingId(requestId);
    try {
      await decideRequest(requestId, { decision }, basePath);
      await refetch();
    } catch (err) {
      setDecideError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setDecidingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-on-surface-variant">Chargement…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
        {mode === "tasks" ? "Aucune tâche en attente." : "Aucune soumission pour le moment."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {decideError && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{decideError}</p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-on-surface">{item.flow_id}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {STATUS_LABEL[item.status] ?? item.status} — étape {item.current_step_order + 1}
            </p>
          </div>

          {mode === "tasks" && item.status === "pending" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleDecide(item.id, "reject")}
                disabled={decidingId === item.id}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-error border border-error/40 hover:bg-error-container/40 disabled:opacity-50"
              >
                Rejeter
              </button>
              <button
                onClick={() => handleDecide(item.id, "approve")}
                disabled={decidingId === item.id}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-on-primary disabled:opacity-50"
              >
                Approuver
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
