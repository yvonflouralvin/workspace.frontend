"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined, FilterListOutlined } from "@mui/icons-material";
import { Badge } from "@repo/ui/Badge";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { STATUS_LABEL } from "@repo/approval-flows/ApprovalTaskList";
import type { RequestSummary } from "@repo/approval-flows/types/request";
import type { FlowSummary } from "@repo/approval-flows/types/flow";
import { DashboardShell } from "@/components/DashboardShell";
import { ConsoleTabs } from "@/components/ConsoleTabs";
import { NewRequestModal } from "@/components/NewRequestModal";
import { listMyRequests, listFlows, ApiError } from "@/app/lib/api";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { id: "pending", label: STATUS_LABEL.pending },
  { id: "needs_update", label: STATUS_LABEL.needs_update },
  { id: "approved", label: STATUS_LABEL.approved },
  { id: "rejected", label: STATUS_LABEL.rejected },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "#004598",
  needs_update: "#9a6700",
  approved: "#006c49",
  rejected: "#ba1a1a",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "numeric" });
}

const COLUMNS: DataListColumn<RequestSummary>[] = [
  {
    key: "created_at",
    header: "Date soumission",
    render: (item) => formatDate(item.created_at),
  },
  {
    key: "flow_title",
    header: "Titre form",
    render: (item) => item.flow_title,
  },
  {
    key: "status",
    header: "Statut",
    render: (item) => (
      <Badge color={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
    ),
  },
];

export default function HomePage() {
  const router = useRouter();

  const [items, setItems] = useState<RequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [flowFilter, setFlowFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);

  useEffect(() => {
    listFlows().then(setFlows).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    listMyRequests({
      q: debouncedQuery || undefined,
      status: statusFilter.length ? statusFilter : undefined,
      flowId: flowFilter || undefined,
      date: dateFilter || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((data) => {
        setItems(data.requests);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, statusFilter, flowFilter, dateFilter, page]);

  const activeFilterCount =
    (dateFilter !== "" ? 1 : 0) + (statusFilter.length > 0 ? 1 : 0) + (flowFilter !== "" ? 1 : 0);

  function resetFilters() {
    setDateFilter("");
    setStatusFilter([]);
    setFlowFilter("");
    setPage(0);
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-5">
        <ConsoleTabs />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Mes demandes</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Formulaires que vous avez soumis, du plus récent au plus ancien.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              <FilterListOutlined style={{ fontSize: 18 }} />
              Filtres
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-on-primary text-xs font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setNewRequestOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouveau
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        <DataList
          serverMode
          items={items}
          totalCount={total}
          loading={loading}
          columns={COLUMNS}
          getRowKey={(item) => item.id}
          onRowClick={(item) => router.push(`/my-requests/${item.id}`)}
          onSearchChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
          onPageChange={setPage}
          pageSize={PAGE_SIZE}
          searchPlaceholder="Rechercher un titre de formulaire…"
          emptyMessage="Aucune demande soumise."
        />
      </div>

      {filtersOpen && (
        <RightDrawer title="Filtres" onClose={() => setFiltersOpen(false)}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Date de soumission</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Statut</label>
              <MultiSelect
                options={STATUS_OPTIONS}
                selectedIds={statusFilter}
                onChange={(ids) => {
                  setStatusFilter(ids as string[]);
                  setPage(0);
                }}
                placeholder="Tous les statuts"
                emptyLabel="Aucun statut."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Type de formulaire</label>
              <select
                value={flowFilter}
                onChange={(e) => {
                  setFlowFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
              >
                <option value="">Tous les formulaires</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between pt-2">
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm font-medium text-primary"
                >
                  Réinitialiser les filtres
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary"
              >
                Fermer
              </button>
            </div>
          </div>
        </RightDrawer>
      )}

      {newRequestOpen && (
        <NewRequestModal
          flows={flows}
          onClose={() => setNewRequestOpen(false)}
          onSelect={(flowId) => router.push(`/submit/${flowId}`)}
        />
      )}
    </DashboardShell>
  );
}
