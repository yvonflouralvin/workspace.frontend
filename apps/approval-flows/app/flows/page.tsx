"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { GardePermission } from "@/components/GardePermission";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { listFlows, updateFlow, ApiError } from "@/app/lib/api";
import type { FlowSummary } from "@repo/approval-flows/types/flow";

function statusLabel(flow: FlowSummary): string {
  if (flow.configured) return "Publié";
  if (flow.has_draft) return "Brouillon";
  return "Non configuré";
}

export default function FlowsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("approval_flows.manage");
  const [bascule, setBascule] = useState<string | null>(null);

  const [items, setItems] = useState<FlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    { key: "status", header: "Statut", render: (flow) => statusLabel(flow) },
    {
      key: "catalogue",
      header: "Au catalogue",
      render: (flow) => (
        <button
          type="button"
          disabled={!flow.configured || bascule === flow.id}
          title={
            !flow.configured
              ? "Publiez une version : il n'y a rien à remplir pour l'instant."
              : flow.catalogue_visible
                ? "Proposé dans « Nouvelle demande ». Cliquez pour le retirer."
                : "Absent de « Nouvelle demande » — il se remplit depuis son application. Cliquez pour l'ouvrir."
          }
          onClick={(e) => {
            e.stopPropagation();
            void basculerCatalogue(flow);
          }}
          className={`rounded-full px-2.5 py-1 text-label-md transition-colors disabled:opacity-40 ${
            flow.catalogue_visible
              ? "bg-secondary/15 text-secondary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          {flow.catalogue_visible ? "Proposé" : "Masqué"}
        </button>
      ),
    },
  ];

  /** Ouvrir ou retirer un formulaire du catalogue.
   *
   *  Le clic ne doit pas ouvrir l'éditeur : c'est un réglage, pas une
   *  navigation — d'où le `stopPropagation` sur la ligne cliquable. */
  async function basculerCatalogue(flow: FlowSummary) {
    setBascule(flow.id);
    try {
      const maj = await updateFlow(flow.id, {
        visible_group_ids: flow.visible_group_ids,
        destination_user_ids: flow.destination_user_ids,
        destination_group_ids: flow.destination_group_ids,
        catalogue_visible: !flow.catalogue_visible,
      });
      setItems((prev) => prev.map((f) => (f.id === flow.id ? { ...f, ...maj } : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Réglage impossible.");
    } finally {
      setBascule(null);
    }
  }

  function handleRowClick(flow: FlowSummary) {
    router.push(`/flows/${flow.id}/edit`);
  }

  return (
    <DashboardShell>
      <GardePermission permission="approval_flows.manage" quoi="Conception des flux">
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-5">
        <ConsoleTabs />
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Flows d&apos;approbation</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Templates enregistrés par les applications et flows créés librement.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => router.push("/flows/new")}
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
    </GardePermission>
    </DashboardShell>
  );
}
