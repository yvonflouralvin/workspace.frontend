"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Pagination } from "@repo/ui/Pagination";
import { DashboardShell } from "@/components/DashboardShell";
import { CategorieDrawer } from "@/components/CategorieDrawer";
import { listCategoriesPage, deleteCategorie, type Categorie } from "@/lib/ventes-api";
import {
  ArrowBackOutlined,
  AddOutlined,
  EditOutlined,
  DeleteOutlineOutlined,
  SearchOutlined,
  CategoryOutlined,
} from "@mui/icons-material";

const PAGE_SIZE = 20;

export default function CategoriesPage() {
  const { can } = usePermissions();
  const canView = can("ventes.produits.view");
  const canManage = can("ventes.produits.manage");

  const [items, setItems] = useState<Categorie[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; categorie: Categorie | null }>({
    open: false,
    categorie: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef(search);

  function fetchData(q: string, p: number) {
    setLoading(true);
    setError(null);
    listCategoriesPage({ q: q || undefined, page: p, page_size: PAGE_SIZE })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les catégories."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    fetchData(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  function handleSearch(value: string) {
    setSearch(value);
    pendingSearch.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(pendingSearch.current, 1);
    }, 300);
  }

  function handlePage(p: number) {
    setPage(p);
    fetchData(search, p);
  }

  async function handleDelete(id: number) {
    try {
      await deleteCategorie(id);
      fetchData(search, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Link
          href="/produits"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux produits
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Catégories</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Catégories de produit de ce workspace.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setDrawer({ open: true, categorie: null })}
              className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0"
            >
              <AddOutlined style={{ fontSize: 18 }} /> Nouvelle catégorie
            </button>
          )}
        </div>

        {canView && (
          <div className="relative max-w-[28rem]">
            <SearchOutlined
              style={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="search"
              placeholder="Nom de la catégorie…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
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
            <CategoryOutlined style={{ fontSize: 48, opacity: 0.4 }} />
            <p className="text-body-md">
              {search ? `Aucun résultat pour « ${search} ».` : "Aucune catégorie."}
            </p>
          </div>
        )}

        {canView && !loading && !error && items.length > 0 && (
          <>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
              {items.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium text-on-surface">{c.nom}</p>
                    {c.description && (
                      <p className="text-body-sm text-on-surface-variant truncate">{c.description}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setDrawer({ open: true, categorie: c })}
                        title="Modifier"
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                      >
                        <EditOutlined style={{ fontSize: 16 }} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        title="Supprimer"
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                      >
                        <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-1 min-w-0">
                <p className="text-body-sm text-on-surface-variant truncate">
                  {total} catégorie{total > 1 ? "s" : ""}{search && ` pour « ${search} »`}
                </p>
                <Pagination page={page} pages={pages} onChange={handlePage} className="flex-none" />
              </div>
            )}
          </>
        )}
      </div>

      {drawer.open && (
        <CategorieDrawer
          categorie={drawer.categorie}
          onClose={() => setDrawer({ open: false, categorie: null })}
          onSaved={() => { setPage(1); fetchData(search, 1); }}
        />
      )}
    </DashboardShell>
  );
}
