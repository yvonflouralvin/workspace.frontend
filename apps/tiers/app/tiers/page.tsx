"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchField } from "@repo/ui/SearchField";
import { ActiveFilters } from "@repo/ui/FilterBar";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listTiers,
  TYPE_LABELS,
  TYPE_TONES,
  CATEGORIE_LABELS,
  type TiersSummary,
  type TypeTiers,
} from "@/lib/tiers-api";
import {
  AddOutlined,
  BusinessOutlined,
  DownloadOutlined,
  GroupsOutlined,
  PersonOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

const PAGE_SIZE = 20;

type FilterType = "TOUS" | TypeTiers;

const TABS: { label: string; value: FilterType }[] = [
  { label: "Tous", value: "TOUS" },
  { label: "Clients", value: "CLIENT" },
  { label: "Fournisseurs", value: "FOURNISSEUR" },
];

export default function TiersPage() {
  return (
    <Suspense fallback={<DashboardShell><div className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</div></DashboardShell>}>
      <TiersInner />
    </Suspense>
  );
}

function TiersInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canView = can("tiers.tiers.view");
  const canCreate = can("tiers.tiers.create");

  const [activeTab, setActiveTab] = useState<FilterType>(
    (searchParams.get("type") as FilterType) ?? "TOUS"
  );
  const [showArchived, setShowArchived] = useState(false);
  const [items, setItems] = useState<TiersSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchData(q: string, p: number, tab: FilterType, archived: boolean) {
    setLoading(true);
    setError(null);
    listTiers({
      q: q || undefined,
      type: tab !== "TOUS" ? tab : undefined,
      actif: archived ? false : true,
      page: p,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les tiers."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    fetchData(search, page, activeTab, showArchived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  function apply(next: { q?: string; tab?: FilterType; archived?: boolean; page?: number }) {
    const q = next.q ?? search;
    const tab = next.tab ?? activeTab;
    const archived = next.archived ?? showArchived;
    const p = next.page ?? 1;
    setSearch(q);
    setActiveTab(tab);
    setShowArchived(archived);
    setPage(p);
    fetchData(q, p, tab, archived);
  }

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply({ q: value, page: 1 }), 300);
  }

  /** Export CSV de tout le répertoire filtré — pas seulement la page courante. */
  async function exportCsv() {
    setExporting(true);
    try {
      const rows: TiersSummary[] = [];
      let p = 1;
      let totalPages = 1;
      do {
        const data = await listTiers({
          q: search || undefined,
          type: activeTab !== "TOUS" ? activeTab : undefined,
          actif: showArchived ? false : true,
          page: p,
          page_size: 100,
        });
        rows.push(...data.items);
        totalPages = data.pages;
        p += 1;
      } while (p <= totalPages);

      const header = ["Code", "Nom", "Type", "Catégorie", "Email", "Téléphone", "Ville"];
      const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [
        header.join(";"),
        ...rows.map((t) =>
          [
            t.code,
            t.nom,
            TYPE_LABELS[t.type],
            CATEGORIE_LABELS[t.categorie],
            t.email,
            t.telephone,
            t.adresse_ville,
          ]
            .map(escape)
            .join(";")
        ),
      ].join("\n");

      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tiers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToast(`${rows.length} tiers exporté${rows.length > 1 ? "s" : ""}.`);
    } catch {
      setToast("L'export a échoué.");
    } finally {
      setExporting(false);
    }
  }

  const activeFilters = useMemo(() => {
    const filters = [];
    if (activeTab !== "TOUS") {
      filters.push({
        key: "type",
        label: TABS.find((t) => t.value === activeTab)?.label ?? activeTab,
        onClear: () => apply({ tab: "TOUS" }),
      });
    }
    if (showArchived) {
      filters.push({ key: "archived", label: "Archivés", onClear: () => apply({ archived: false }) });
    }
    if (search) {
      filters.push({ key: "q", label: `« ${search} »`, onClear: () => apply({ q: "" }) });
    }
    return filters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, showArchived, search]);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="hidden md:block flex-1">
            <h1 className="font-display text-headline-md text-on-surface">Tiers</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Répertoire des clients et fournisseurs de ce workspace.
            </p>
          </div>
          <div className="flex flex-1 md:flex-none items-center gap-2.5">
            {canView && (
              <button
                onClick={exportCsv}
                disabled={exporting}
                className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <DownloadOutlined style={{ fontSize: 16 }} />
                {exporting ? "Export…" : "Exporter"}
              </button>
            )}
            {canCreate && (
              <Link
                href="/tiers/new"
                className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Nouveau tiers
              </Link>
            )}
          </div>
        </div>

        {canView && (
          <>
            <div className="flex items-center gap-1 border-b border-outline-soft overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => apply({ tab: tab.value })}
                  className={`px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SearchField
                value={search}
                onChange={handleSearch}
                placeholder="Nom, code, email, téléphone…"
                className="flex-1 min-w-[200px] md:flex-none md:w-[280px]"
              />
              <label className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => apply({ archived: e.target.checked })}
                  className="w-4 h-4 accent-primary"
                />
                Afficher les archivés
              </label>
            </div>

            <ActiveFilters
              filters={activeFilters}
              onClearAll={() => apply({ q: "", tab: "TOUS", archived: false })}
            />
          </>
        )}

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les tiers.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {canView && loading && <SkeletonList />}

        {canView && !loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <GroupsOutlined style={{ fontSize: 48 }} className="text-outline-variant" />
            <p className="text-body-md">
              {search ? `Aucun résultat pour « ${search} ».` : "Aucun tiers enregistré."}
            </p>
            {!search && canCreate && (
              <Link href="/tiers/new" className="text-body-sm font-semibold text-primary hover:underline">
                Créer le premier tiers
              </Link>
            )}
          </div>
        )}

        {canView && !loading && !error && items.length > 0 && (
          <>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
                <span className="w-24 flex-none">Code</span>
                <span className="flex-1">Nom</span>
                <span className="w-[150px] flex-none">Type</span>
                <span className="w-[190px] flex-none">Email</span>
                <span className="w-[130px] flex-none">Téléphone</span>
                <span className="w-[110px] flex-none">Ville</span>
              </div>

              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/tiers/${t.id}`)}
                  className={`w-full flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3.5 md:py-3 text-left border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors ${
                    t.is_active ? "" : "opacity-60"
                  }`}
                >
                  <span className="hidden md:block w-24 flex-none font-mono text-label-md text-outline">
                    {t.code}
                  </span>
                  <span className="w-full md:flex-1 min-w-0 flex items-center gap-2.5">
                    <TiersAvatar tiers={t} />
                    <span className="min-w-0">
                      <span className="block text-body-md font-medium text-on-surface truncate">
                        {t.nom}
                      </span>
                      <span className="block md:hidden font-mono text-label-md text-outline">
                        {t.code}
                      </span>
                    </span>
                  </span>
                  <span className="md:w-[150px] flex-none flex items-center gap-1.5">
                    <TypeBadge type={t.type} />
                    {!t.is_active && (
                      <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[11px] font-semibold text-outline">
                        Archivé
                      </span>
                    )}
                  </span>
                  <span className="hidden md:block w-[190px] flex-none truncate text-body-sm text-on-surface-variant">
                    {t.email ?? "—"}
                  </span>
                  <span className="hidden md:block w-[130px] flex-none text-body-sm text-on-surface-variant">
                    {t.telephone ?? "—"}
                  </span>
                  <span className="hidden md:block w-[110px] flex-none truncate text-body-sm text-on-surface-variant">
                    {t.adresse_ville ?? "—"}
                  </span>
                </button>
              ))}

              <div className="flex items-center justify-between px-4 md:px-5 py-3 text-body-sm text-outline">
                <span>
                  {total} tiers{search && ` pour « ${search} »`}
                </span>
                {pages > 1 && (
                  <div className="flex gap-1">
                    <PageButton
                      label="Page précédente"
                      disabled={page === 1}
                      onClick={() => apply({ page: page - 1 })}
                    >
                      <ChevronLeftOutlined style={{ fontSize: 15 }} />
                    </PageButton>
                    <span className="px-2 self-center text-label-md">
                      {page} / {pages}
                    </span>
                    <PageButton
                      label="Page suivante"
                      disabled={page === pages}
                      onClick={() => apply({ page: page + 1 })}
                    >
                      <ChevronRightOutlined style={{ fontSize: 15 }} />
                    </PageButton>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}

export function TiersAvatar({
  tiers,
  size = 32,
}: {
  tiers: { nom: string; categorie: string };
  size?: number;
}) {
  const entreprise = tiers.categorie === "ENTREPRISE";
  return (
    <span
      className={`flex-none inline-flex items-center justify-center bg-primary/10 text-primary ${
        entreprise ? "rounded-lg" : "rounded-full"
      }`}
      style={{ width: size, height: size }}
      title={CATEGORIE_LABELS[tiers.categorie as "ENTREPRISE" | "PARTICULIER"]}
    >
      {entreprise ? (
        <BusinessOutlined style={{ fontSize: size * 0.5 }} />
      ) : (
        <PersonOutlined style={{ fontSize: size * 0.5 }} />
      )}
    </span>
  );
}

export function TypeBadge({ type }: { type: TypeTiers }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TYPE_TONES[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

function PageButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 md:px-5 py-3.5 border-b border-hairline">
          <div className="w-8 h-8 rounded-lg bg-surface-container-low animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-40 rounded bg-surface-container-low animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-surface-container-low animate-pulse" />
          </div>
          <div className="hidden md:block h-5 w-24 rounded bg-surface-container-low animate-pulse" />
        </div>
      ))}
    </div>
  );
}
