"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { LockedBadge } from "@repo/ui/LockedBadge";
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
      <div className="p-8 max-w-6xl mx-auto space-y-6">
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
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                    <th className="px-5 py-3 font-medium">Nom</th>
                    <th className="px-5 py-3 font-medium">Catégorie</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium text-right">
                      <button
                        onClick={handleSortPrix}
                        className="inline-flex items-center gap-1 font-medium hover:text-on-surface transition-colors"
                      >
                        Prix de vente
                        {sort === "prix_asc" ? (
                          <ArrowUpwardOutlined style={{ fontSize: 15 }} />
                        ) : sort === "prix_desc" ? (
                          <ArrowDownwardOutlined style={{ fontSize: 15 }} />
                        ) : (
                          <SwapVertOutlined style={{ fontSize: 15, opacity: 0.5 }} />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/produits/${p.id}`)}
                      className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer ${p.owner_app_key ? "bg-locked-surface" : ""}`}
                    >
                      <td className="px-5 py-3 text-on-surface font-medium">
                        <span className="inline-flex items-center gap-2">
                          {p.nom}
                          {p.owner_app_key && <LockedBadge appLabel={p.owner_app_key} />}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        {p.categories.length ? p.categories.map((c) => c.nom).join(", ") : "—"}
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant max-w-xs truncate">{p.description || "—"}</td>
                      <td className="px-5 py-3 text-on-surface text-right tabular-nums">{formatPrix(p.prix_vente, deviseBase)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-body-sm text-on-surface-variant">
                  {total} produit{total > 1 ? "s" : ""}
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

      {showCreate && (
        <CreateProduitDrawer
          onClose={() => setShowCreate(false)}
          onCreated={() => { setPage(1); fetchData(search, 1, categorieId, sort); }}
        />
      )}
    </DashboardShell>
  );
}
