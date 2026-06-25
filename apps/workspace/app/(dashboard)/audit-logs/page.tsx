"use client";

import { useEffect, useState } from "react";
import { FilterListOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Badge } from "@repo/ui/Badge";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { listAuditLogs, getAuditLogFacets, ApiError } from "@/app/lib/api";
import type { AuditLog, AuditLogFacets } from "@/app/lib/types";

const PAGE_SIZE = 20;

const APPLICATION_COLOR: Record<string, string> = {
  auth: "#3525cd",
  workspace: "#3525cd",
  hr: "#006c49",
  approval_flows: "#004598",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocation(log: AuditLog): string {
  return [log.location_city, log.location_country].filter(Boolean).join(", ") || "—";
}

const COLUMNS: DataListColumn<AuditLog>[] = [
  {
    key: "occurred_at",
    header: "Date",
    render: (item) => formatDateTime(item.occurred_at),
  },
  {
    key: "user_email",
    header: "Email",
    render: (item) => item.user_email,
  },
  {
    key: "application",
    header: "Application",
    render: (item) => (
      <Badge color={APPLICATION_COLOR[item.application] ?? "#777587"}>{item.application}</Badge>
    ),
  },
  {
    key: "event_type",
    header: "Type",
    render: (item) => <Badge>{item.event_type}</Badge>,
  },
  {
    key: "location",
    header: "Emplacement",
    render: (item) => formatLocation(item),
  },
  {
    key: "ip_address",
    header: "IP",
    render: (item) => item.ip_address,
  },
  {
    key: "device",
    header: "Device / Navigateur",
    render: (item) => [item.device, item.browser].filter(Boolean).join(" — ") || "—",
  },
];

export default function AuditLogsPage() {
  const { can } = usePermissions();
  const canView = can("audit_logs.view");

  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);

  const [userEmailFilter, setUserEmailFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ipFilter, setIpFilter] = useState<string[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<string[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);
  const [applicationFilter, setApplicationFilter] = useState<string[]>([]);

  const [facets, setFacets] = useState<AuditLogFacets | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!canView) return;
    getAuditLogFacets().then(setFacets).catch(() => {});
  }, [canView]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    listAuditLogs({
      q: debouncedQuery || undefined,
      userEmail: userEmailFilter || undefined,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
      location: locationFilter || undefined,
      ipAddress: ipFilter.length ? ipFilter : undefined,
      device: deviceFilter.length ? deviceFilter : undefined,
      eventType: eventTypeFilter.length ? eventTypeFilter : undefined,
      application: applicationFilter.length ? applicationFilter : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then((data) => {
        setItems(data.logs);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, [
    canView,
    debouncedQuery,
    userEmailFilter,
    dateFromFilter,
    dateToFilter,
    locationFilter,
    ipFilter,
    deviceFilter,
    eventTypeFilter,
    applicationFilter,
    page,
  ]);

  const activeFilterCount =
    (userEmailFilter !== "" ? 1 : 0) +
    (dateFromFilter !== "" || dateToFilter !== "" ? 1 : 0) +
    (locationFilter !== "" ? 1 : 0) +
    (ipFilter.length > 0 ? 1 : 0) +
    (deviceFilter.length > 0 ? 1 : 0) +
    (eventTypeFilter.length > 0 ? 1 : 0) +
    (applicationFilter.length > 0 ? 1 : 0);

  function resetFilters() {
    setUserEmailFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setLocationFilter("");
    setIpFilter([]);
    setDeviceFilter([]);
    setEventTypeFilter([]);
    setApplicationFilter([]);
    setPage(0);
  }

  if (!canView) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-on-surface">Journal d&apos;activité</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Journal d&apos;activité</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Connexions et actions effectuées sur la plateforme.
          </p>
        </div>
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
        onSearchChange={(value) => {
          setQuery(value);
          setPage(0);
        }}
        onPageChange={setPage}
        pageSize={PAGE_SIZE}
        searchPlaceholder="Rechercher (email, type, IP, métadonnées…)"
        emptyMessage="Aucun log d'audit."
      />

      {filtersOpen && (
        <RightDrawer title="Filtres" onClose={() => setFiltersOpen(false)}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Email</label>
              <input
                type="text"
                value={userEmailFilter}
                onChange={(e) => {
                  setUserEmailFilter(e.target.value);
                  setPage(0);
                }}
                placeholder="email@exemple.com"
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-on-surface-variant">Du</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => {
                    setDateFromFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-on-surface-variant">Au</label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => {
                    setDateToFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Emplacement</label>
              <select
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
              >
                <option value="">Tous les emplacements</option>
                {(facets?.locations ?? []).map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Adresses IP</label>
              <MultiSelect
                options={(facets?.ip_addresses ?? []).map((ip) => ({ id: ip, label: ip }))}
                selectedIds={ipFilter}
                onChange={(ids) => {
                  setIpFilter(ids as string[]);
                  setPage(0);
                }}
                placeholder="Toutes les IP"
                emptyLabel="Aucune IP."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Devices</label>
              <MultiSelect
                options={(facets?.devices ?? []).map((device) => ({ id: device, label: device }))}
                selectedIds={deviceFilter}
                onChange={(ids) => {
                  setDeviceFilter(ids as string[]);
                  setPage(0);
                }}
                placeholder="Tous les devices"
                emptyLabel="Aucun device."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Type</label>
              <MultiSelect
                options={(facets?.event_types ?? []).map((type) => ({ id: type, label: type }))}
                selectedIds={eventTypeFilter}
                onChange={(ids) => {
                  setEventTypeFilter(ids as string[]);
                  setPage(0);
                }}
                placeholder="Tous les types"
                emptyLabel="Aucun type."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Application</label>
              <MultiSelect
                options={(facets?.applications ?? []).map((app) => ({ id: app, label: app }))}
                selectedIds={applicationFilter}
                onChange={(ids) => {
                  setApplicationFilter(ids as string[]);
                  setPage(0);
                }}
                placeholder="Toutes les applications"
                emptyLabel="Aucune application."
              />
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
    </div>
  );
}
