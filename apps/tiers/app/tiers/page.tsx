"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listTiers,
  type TiersSummary,
  type TypeTiers,
} from "@/lib/tiers-api";
import {
  AddOutlined,
  SearchOutlined,
  GroupsOutlined,
  PersonOutlined,
  BusinessOutlined,
} from "@mui/icons-material";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<TypeTiers, string> = {
  CLIENT: "Client",
  FOURNISSEUR: "Fournisseur",
  LES_DEUX: "Client & Fourn.",
};

const TYPE_COLORS: Record<TypeTiers, string> = {
  CLIENT: "bg-tertiary/10 text-tertiary",
  FOURNISSEUR: "bg-secondary/10 text-secondary",
  LES_DEUX: "bg-primary/10 text-primary",
};

type FilterType = "TOUS" | TypeTiers;

const TABS: { label: string; value: FilterType; icon: React.ReactNode }[] = [
  { label: "Tous", value: "TOUS", icon: <GroupsOutlined style={{ fontSize: 16 }} /> },
  { label: "Clients", value: "CLIENT", icon: <PersonOutlined style={{ fontSize: 16 }} /> },
  { label: "Fournisseurs", value: "FOURNISSEUR", icon: <BusinessOutlined style={{ fontSize: 16 }} /> },
];

export default function TiersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const canView = can("tiers.tiers.view");
  const canCreate = can("tiers.tiers.create");

  const initialType = (searchParams.get("type") as FilterType) ?? "TOUS";
  const [activeTab, setActiveTab] = useState<FilterType>(initialType);
  const [items, setItems] = useState<TiersSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef(search);

  function fetchData(q: string, p: number, tab: FilterType) {
    setLoading(true);
    setError(null);
    listTiers({
      q: q || undefined,
      type: tab !== "TOUS" ? tab : undefined,
      actif: true,
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
    if (!canView) { setLoading(false); return; }
    fetchData(search, page, activeTab);
  }, [canView]);

  function handleSearch(value: string) {
    setSearch(value);
    pendingSearch.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(pendingSearch.current, 1, activeTab);
    }, 300);
  }

  function handleTab(tab: FilterType) {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    fetchData("", 1, tab);
  }

  function handlePage(p: number) {
    setPage(p);
    fetchData(search, p, activeTab);
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Tiers</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Répertoire des clients et fournisseurs de ce workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canView && (
              <div className="relative w-64">
                <SearchOutlined
                  style={{ fontSize: 18 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <input
                  type="search"
                  placeholder="Nom, code, email, téléphone…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}
            {canCreate && (
              <Link
                href="/tiers/new"
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0"
              >
                <AddOutlined style={{ fontSize: 18 }} />
                Nouveau tiers
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-outline-variant">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTab(tab.value)}
              className={[
                "inline-flex items-center gap-1.5 px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant",
              ].join(" ")}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les tiers.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        )}

        {canView && !loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <GroupsOutlined style={{ fontSize: 48, opacity: 0.4 }} />
            <p className="text-body-md">
              {search ? `Aucun résultat pour « ${search} ».` : "Aucun tiers enregistré."}
            </p>
            {!search && canCreate && (
              <Link href="/tiers/new" className="text-body-sm text-primary underline underline-offset-2">
                Créer le premier tiers
              </Link>
            )}
          </div>
        )}

        {canView && !loading && !error && items.length > 0 && (
          <>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Nom</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Téléphone</th>
                    <th className="px-5 py-3 font-medium">Ville</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/tiers/${t.id}`)}
                      className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono text-label-md text-on-surface-variant">
                        {t.code}
                      </td>
                      <td className="px-5 py-3 text-on-surface font-medium">{t.nom}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium ${TYPE_COLORS[t.type]}`}>
                          {TYPE_LABELS[t.type]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">{t.email ?? "—"}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{t.telephone ?? "—"}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{t.adresse_ville ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-body-sm text-on-surface-variant">
                  {total} tiers{search && ` pour « ${search} »`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors"
                  >
                    ← Précédent
                  </button>
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => handlePage(n)}
                      className={[
                        "w-8 h-8 rounded-lg text-body-sm font-medium transition-colors",
                        n === page
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:bg-surface-container",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePage(page + 1)}
                    disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
