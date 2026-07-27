"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { LockedBadge } from "@repo/ui/LockedBadge";
import { Pagination } from "@repo/ui/Pagination";
import { CreateProduitDrawer } from "@/components/CreateProduitDrawer";
import { listProduits, listCategories, getFacturationConfig, type Produit, type Categorie } from "@/lib/ventes-api";
import {
  SearchOutlined,
  Inventory2Outlined,
  AddOutlined,
  CategoryOutlined,
  ArrowUpwardOutlined,
  ArrowDownwardOutlined,
  SwapVertOutlined,
} from "@mui/icons-material";

const PAGE_SIZE = 20;

type Sort = "" | "prix_asc" | "prix_desc";

function formatPrix(v: string | number | null, devise: string): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  const s = n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return devise ? `${s} ${devise}` : s;
}

export default function ProduitsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("ventes.produits.view");
  const canManage = can("ventes.produits.manage");
  const [showCreate, setShowCreate] = useState(false);

  const [items, setItems] = useState<Produit[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [sort, setSort] = useState<Sort>("");
  const [cats, setCats] = useState<Categorie[]>([]);
  const [deviseBase, setDeviseBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef(search);

  function fetchData(q: string, p: number, catId: string, sortVal: Sort) {
    setLoading(true);
    setError(null);
    listProduits({
      q: q || undefined,
      categorie_id: catId ? Number(catId) : undefined,
      sort: sortVal || undefined,
      page: p,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les produits."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    getFacturationConfig().then((c) => setDeviseBase(c.devise_base)).catch(() => {});
    listCategories().then(setCats).catch(() => {});
    fetchData(search, page, categorieId, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  function handleSearch(value: string) {
    setSearch(value);
    pendingSearch.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(pendingSearch.current, 1, categorieId, sort);
    }, 300);
  }

  function handleCategory(catId: string) {
    setCategorieId(catId);
    setPage(1);
    fetchData(search, 1, catId, sort);
  }

  function handleSortPrix() {
    const next: Sort = sort === "prix_desc" ? "prix_asc" : sort === "prix_asc" ? "" : "prix_desc";
    setSort(next);
    setPage(1);
    fetchData(search, 1, categorieId, next);
  }

  function handlePage(p: number) {
    setPage(p);
    fetchData(search, p, categorieId, sort);
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Produits</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Produits de vente de ce workspace. Chaque produit peut être publié dans Stock.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canView && (
              <Link
                href="/produits/categories"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors shrink-0"
              >
                <CategoryOutlined style={{ fontSize: 18 }} />
                Catégories
              </Link>
            )}
            {canManage && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0"
              >
                <AddOutlined style={{ fontSize: 18 }} />
                Nouveau produit
              </button>
            )}
          </div>
        </div>

        {canView && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-80">
              <SearchOutlined
                style={{ fontSize: 18 }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
              <input
                type="search"
                placeholder="Nom du produit…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <select
              value={categorieId}
              onChange={(e) => handleCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Toutes les catégories</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
        )}

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les produits.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <Inventory2Outlined style={{ fontSize: 48, opacity: 0.4 }} />
            <p className="text-body-md">
              {search || categorieId ? "Aucun résultat pour ce filtre." : "Aucun produit."}
            </p>
          </div>
        )}

        {canView && !loading && !error && items.length > 0 && (
          <>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
                <span className="flex-1 min-w-0">Produit</span>
                <span className="w-[200px] flex-none">Catégories</span>
                <span className="w-[70px] flex-none text-center">TVA</span>
                <span className="w-[150px] flex-none text-right">
                  <button
                    onClick={handleSortPrix}
                    className="inline-flex items-center gap-1 uppercase hover:text-on-surface transition-colors"
                  >
                    Prix
                    {sort === "prix_asc" ? (
                      <ArrowUpwardOutlined style={{ fontSize: 14 }} />
                    ) : sort === "prix_desc" ? (
                      <ArrowDownwardOutlined style={{ fontSize: 14 }} />
                    ) : (
                      <SwapVertOutlined style={{ fontSize: 14, opacity: 0.5 }} />
                    )}
                  </button>
                </span>
              </div>

              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/produits/${p.id}`)}
                  className={`w-full block text-left border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors ${
                    p.owner_app_key ? "bg-locked-surface" : ""
                  }`}
                >
                  {/* Carte (mobile) et rangée (bureau) sont deux blocs distincts :
                      une seule rangée pilotée par des variantes md: retombait en pile
                      dès qu'une de ces règles manquait. */}
                  <span className="md:hidden block px-4 py-3 space-y-1.5">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-body-md font-medium text-on-surface truncate">
                            {p.nom}
                          </span>
                          {p.owner_app_key && <LockedBadge appLabel={p.owner_app_key} />}
                        </span>
                        <span className="block text-label-md text-outline truncate">
                          {p.unite || p.description || "—"}
                        </span>
                      </span>
                      <span className="flex-none whitespace-nowrap tabular-nums font-mono text-body-sm font-semibold text-on-surface">
                        {formatPrix(p.prix_vente, deviseBase)}
                      </span>
                    </span>
                    {(p.categories.length > 0 || p.tva_applicable) && (
                      <span className="flex flex-wrap items-center gap-1">
                        {p.categories.map((c) => (
                          <span
                            key={c.id}
                            className="rounded-md bg-role-member-container px-1.5 py-0.5 text-[11px] font-medium text-role-member whitespace-nowrap"
                          >
                            {c.nom}
                          </span>
                        ))}
                        {p.tva_applicable && (
                          <span className="rounded-md bg-surface-container px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant">
                            TVA
                          </span>
                        )}
                      </span>
                    )}
                  </span>

                  <span className="hidden md:flex items-center gap-4 px-5 py-3">
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-body-md font-medium text-on-surface truncate">{p.nom}</span>
                        {p.owner_app_key && <LockedBadge appLabel={p.owner_app_key} />}
                      </span>
                      <span className="block text-label-md text-outline truncate">
                        {p.unite || p.description || "—"}
                      </span>
                    </span>

                    <span className="w-[200px] flex-none flex flex-wrap gap-1">
                      {p.categories.length ? (
                        p.categories.map((c) => (
                          <span
                            key={c.id}
                            className="rounded-md bg-role-member-container px-1.5 py-0.5 text-[11px] font-medium text-role-member whitespace-nowrap"
                          >
                            {c.nom}
                          </span>
                        ))
                      ) : (
                        <span className="text-label-md text-outline">—</span>
                      )}
                    </span>

                    <span className="w-[70px] flex-none text-center text-body-sm text-on-surface-variant">
                      {p.tva_applicable ? "Oui" : "Non"}
                    </span>

                    <span className="w-[150px] flex-none text-right whitespace-nowrap tabular-nums font-mono text-body-sm font-semibold text-on-surface">
                      {formatPrix(p.prix_vente, deviseBase)}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-1 min-w-0">
                <p className="text-body-sm text-on-surface-variant truncate">
                  {total} produit{total > 1 ? "s" : ""}
                </p>
                <Pagination page={page} pages={pages} onChange={handlePage} className="flex-none" />
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateProduitDrawer
          onClose={() => setShowCreate(false)}
          onCreated={() => { setPage(1); fetchData(search, 1, categorieId, sort); }}
        />
      )}
    </DashboardShell>
  );
}
