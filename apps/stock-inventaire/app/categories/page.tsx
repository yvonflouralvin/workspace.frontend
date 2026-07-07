"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  searchCategories,
  createCategorie,
  updateCategorie,
  type CategorieDetail,
} from "@/lib/stock-api";
import {
  AddOutlined,
  EditOutlined,
  BlockOutlined,
  SearchOutlined,
  CategoryOutlined,
} from "@mui/icons-material";

const PAGE_SIZE = 20;

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

type DrawerState = { mode: "create" } | { mode: "edit"; cat: CategorieDetail } | null;

export default function CategoriesPage() {
  const { can } = usePermissions();
  const canView = can("stock.items.view");
  const canManage = can("stock.categories.manage");

  const [categories, setCategories] = useState<CategorieDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [form, setForm] = useState({ nom: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback((q: string, p: number) => {
    setLoading(true);
    setError(null);
    searchCategories({ q: q || undefined, actif: true, page: p, page_size: PAGE_SIZE })
      .then((data) => {
        setCategories(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les catégories."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    fetchData(search, page);
  }, [page, canView, fetchData]);

  function handleSearch(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(val, 1);
    }, 300);
  }

  function openCreate() {
    setForm({ nom: "", description: "" });
    setFormError(null);
    setDrawer({ mode: "create" });
  }

  function openEdit(cat: CategorieDetail) {
    setForm({ nom: cat.nom, description: cat.description ?? "" });
    setFormError(null);
    setDrawer({ mode: "edit", cat });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) { setFormError("Le nom est obligatoire."); return; }
    setSaving(true);
    setFormError(null);
    try {
      if (drawer?.mode === "create") {
        await createCategorie({ nom: form.nom.trim(), description: form.description || undefined });
      } else if (drawer?.mode === "edit") {
        await updateCategorie(drawer.cat.id, { nom: form.nom.trim(), description: form.description || undefined });
      }
      setDrawer(null);
      setPage(1);
      fetchData(search, 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(cat: CategorieDetail) {
    try {
      await updateCategorie(cat.id, { is_active: !cat.is_active });
      fetchData(search, page);
    } catch { /* silent */ }
  }

  return (
    <DashboardShell>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Catégories</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Regroupez vos articles par catégorie.
            </p>
          </div>
          {canManage && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors shrink-0"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouvelle catégorie
            </button>
          )}
        </div>

        <div className="relative">
          <SearchOutlined
            style={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher une catégorie…"
            className={`${inputCls} pl-9`}
          />
        </div>

        {!canView ? (
          <p className="text-body-sm text-on-surface-variant text-center py-8">Accès non autorisé.</p>
        ) : error ? (
          <p className="text-body-sm text-error text-center py-8">{error}</p>
        ) : loading ? (
          <p className="text-body-sm text-on-surface-variant text-center py-8">Chargement…</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
            <CategoryOutlined style={{ fontSize: 48 }} className="opacity-30" />
            <p className="text-body-md">{search ? "Aucune catégorie trouvée." : "Aucune catégorie créée."}</p>
          </div>
        ) : (
          <>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="text-left px-4 py-3 text-label-md font-semibold text-on-surface-variant">Nom</th>
                    <th className="text-left px-4 py-3 text-label-md font-semibold text-on-surface-variant">Description</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} className="border-b border-outline-variant/50 last:border-0 hover:bg-surface-container-low transition-colors group">
                      <td className="px-4 py-3 font-medium text-on-surface">{cat.nom}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{cat.description ?? "—"}</td>
                      <td className="px-4 py-3">
                        {canManage && (
                          <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(cat)}
                              title="Modifier"
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                            >
                              <EditOutlined style={{ fontSize: 16 }} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(cat)}
                              title="Désactiver"
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors"
                            >
                              <BlockOutlined style={{ fontSize: 16 }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant">
                {total} catégorie{total > 1 ? "s" : ""}
              </p>
              {pages > 1 && (
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg text-body-sm border border-outline-variant disabled:opacity-40 hover:bg-surface-container transition-colors"
                  >
                    Précédent
                  </button>
                  <span className="px-3 py-1.5 text-body-sm text-on-surface-variant">
                    {page} / {pages}
                  </span>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-body-sm border border-outline-variant disabled:opacity-40 hover:bg-surface-container transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {drawer && (
        <RightDrawer
          title={drawer.mode === "create" ? "Nouvelle catégorie" : "Modifier la catégorie"}
          onClose={() => setDrawer(null)}
          width="w-[420px] max-w-full"
          contentClassName="px-6 py-5 overflow-y-auto"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 h-full">
            {formError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{formError}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md text-on-surface-variant">Nom *</label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Ex : Fournitures de bureau"
                className={inputCls}
                autoFocus
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md text-on-surface-variant">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optionnel"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="mt-auto flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-on-primary text-body-sm rounded-xl font-medium disabled:opacity-60 transition-colors"
              >
                {saving ? "Enregistrement…" : drawer.mode === "create" ? "Créer" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setDrawer(null)}
                className="px-4 py-2 text-body-sm border border-outline-variant rounded-xl hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}
