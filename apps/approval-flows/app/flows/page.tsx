"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { FlowFormDrawer } from "@/components/FlowFormDrawer";
import { listFlows, ApiError } from "@/app/lib/api";
import type { FlowSummary } from "@repo/approval-flows/types/flow";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export default function FlowsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("approval_flows.manage");

  const [items, setItems] = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refetch = useCallback(() => {
    setLoading(true);
    listFlows()
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const columns: DataListColumn<FlowSummary>[] = [
    { key: "id", header: "Identifiant", render: (flow) => flow.id },
    { key: "title", header: "Titre", render: (flow) => flow.title },
    {
      key: "origin",
      header: "Origine",
      render: (flow) => (flow.app_key ? `Template (${flow.app_key})` : "Créé librement"),
    },
    { key: "status", header: "Statut", render: (flow) => STATUS_LABEL[flow.status] ?? flow.status },
  ];

  function handleRowClick(flow: FlowSummary) {
    if (flow.app_key) {
      router.push(`/flows/${flow.id}/bindings`);
    }
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Flows d&apos;approbation</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Templates enregistrés par les applications et flows créés librement.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Créer un flow
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {!error && (
          <DataList
            items={items}
            loading={loading}
            columns={columns}
            getRowKey={(flow) => flow.id}
            searchText={(flow) => `${flow.id} ${flow.title}`}
            onRowClick={handleRowClick}
            emptyMessage="Aucun flow pour l'instant."
          />
        )}
      </div>

      {showCreate && (
        <FlowFormDrawer
          onClose={() => setShowCreate(false)}
          onSaved={() => refetch()}
        />
      )}
    </DashboardShell>
  );
}
