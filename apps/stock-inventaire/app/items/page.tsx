"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listItems,
  TYPE_ITEM_LABELS,
  type ItemSummary,
  type TypeItem,
} from "@/lib/stock-api";
import {
  AddOutlined,
  SearchOutlined,
  Inventory2Outlined,
  WarningAmberOutlined,
  FilterListOutlined,
  CheckOutlined,
  KeyboardArrowDownOutlined,
} from "@mui/icons-material";

const PAGE_SIZE = 20;

const TYPE_COLORS: Record<TypeItem, string> = {
  PRODUIT: "bg-primary/10 text-primary",
  MATERIEL: "bg-tertiary/10 text-tertiary",
  SERVICE: "bg-secondary/10 text-secondary",
  PRESTATION: "bg-secondary/10 text-secondary",
  TELECHARGEABLE: "bg-outline/10 text-on-surface-variant",
};

const ALL_TYPES: TypeItem[] = ["PRODUIT", "MATERIEL", "SERVICE", "PRESTATION", "TELECHARGEABLE"];

const TYPE_OPTIONS: { label: string; value: TypeItem }[] = [
  { label: "Produits", value: "PRODUIT" },
  { label: "Matériels", value: "MATERIEL" },
  { label: "Services", value: "SERVICE" },
  { label: "Prestations", value: "PRESTATION" },
  { label: "Téléchargeables", value: "TELECHARGEABLE" },
];

export default function ItemsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("stock.items.view");
  const canCreate = can("stock.items.create");

  const [selectedTypes, setSelectedTypes] = useState<TypeItem[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function fetchData(q: string, p: number, types: TypeItem[]) {
    setLoading(true);
    setError(null);
    listItems({
      q: q || undefined,
      types: types.length ? types : undefined,
      actif: true,
      page: p,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les articles."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    fetchData(search, page, selectedTypes);
  }, [page, selectedTypes, canView]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSearch(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(val, 1, selectedTypes);
    }, 300);
  }

  function toggleType(type: TypeItem) {
    setSelectedTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      setPage(1);
      return next;
    });
  }

  function clearTypes() {
    setSelectedTypes([]);
    setPage(1);
  }

  const filterLabel =
    selectedTypes.length === 0
      ? "Tous les types"
      : selectedTypes.length === 1
      ? TYPE_ITEM_LABELS[selectedTypes[0]]
      : `${selectedTypes.length} types`;

  const filterActive = selectedTypes.length > 0;

  const inputCls =
    "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

  return (
    <DashboardShell>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Articles</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Catalogue des articles, produits et services du workspace.
            </p>
          </div>
          {canCreate && (
            <Link
              href="/items/new"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors shrink-0"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouvel article
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchOutlined
              style={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Nom, code, référence…"
              className={`${inputCls} pl-9`}
            />
          </div>

          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-body-md transition-colors ${
                filterActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <FilterListOutlined style={{ fontSize: 18 }} />
              <span>{filterLabel}</span>
              <KeyboardArrowDownOutlined
                style={{ fontSize: 18 }}
                className={`transition-transform ${filterOpen ? "rotate-180" : ""}`}
              />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg py-1">
                <button
                  onClick={clearTypes}
                  className={`w-full flex items-center justify-between px-4 py-2 text-body-md transition-colors hover:bg-surface-container-low ${
                    selectedTypes.length === 0 ? "text-primary font-medium" : "text-on-surface-variant"
                  }`}
                >
                  Tous les types
                  {selectedTypes.length === 0 && <CheckOutlined style={{ fontSize: 16 }} />}
                </button>
                <div className="border-t border-outline-variant/50 my-1" />
                {TYPE_OPTIONS.map((opt) => {
                  const checked = selectedTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleType(opt.value)}
                      className="w-full flex items-center justify-between px-4 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span>{opt.label}</span>
                      {checked && <CheckOutlined style={{ fontSize: 16 }} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!canView ? (
          <p className="text-body-sm text-on-surface-variant py-8 text-center">
            Vous n&apos;avez pas accès au catalogue d&apos;articles.
          </p>
        ) : error ? (
          <p className="text-body-sm text-error py-8 text-center">{error}</p>
        ) : loading ? (
          <p className="text-body-sm text-on-surface-variant py-8 text-center">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
            <Inventory2Outlined style={{ fontSize: 48 }} className="opacity-30" />
            <p className="text-body-md">Aucun article trouvé.</p>
            {canCreate && !selectedTypes.length && !search && (
              <Link href="/items/new" className="text-primary text-body-sm hover:underline">
                Créer le premier article
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    <th className="text-left px-4 py-3 text-label-md font-semibold text-on-surface-variant">Code</th>
                    <th className="text-left px-4 py-3 text-label-md font-semibold text-on-surface-variant">Nom</th>
                    <th className="text-left px-4 py-3 text-label-md font-semibold text-on-surface-variant">Type</th>
                    <th className="text-left px-4 py-3 text-label-md font-semibold text-on-surface-variant">Catégorie</th>
                    <th className="text-right px-4 py-3 text-label-md font-semibold text-on-surface-variant">Stock</th>
                    <th className="text-right px-4 py-3 text-label-md font-semibold text-on-surface-variant">Prix de vente</th>
                    <th className="text-left px-4 py-3 text-label-md font-semibold text-on-surface-variant">Réf.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const stockAlert =
                      item.gestion_stock &&
                      item.stock_minimum != null &&
                      item.stock_actuel <= item.stock_minimum;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => router.push(`/items/${item.id}`)}
                        className="border-b border-outline-variant/50 hover:bg-surface-container-low cursor-pointer transition-colors last:border-0"
                      >
                        <td className="px-4 py-3 font-mono text-body-sm text-on-surface-variant">{item.code}</td>
                        <td className="px-4 py-3 font-medium text-on-surface">{item.nom}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-label-md font-medium ${TYPE_COLORS[item.type]}`}>
                            {TYPE_ITEM_LABELS[item.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">{item.categorie_nom ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {item.gestion_stock ? (
                            <span className={`flex items-center justify-end gap-1 ${stockAlert ? "text-error" : "text-on-surface"}`}>
                              {stockAlert && <WarningAmberOutlined style={{ fontSize: 14 }} />}
                              {Number(item.stock_actuel)} {item.unite}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-on-surface">
                          {item.est_vendu && item.prix_vente != null
                            ? `${Number(item.prix_vente).toLocaleString("fr-CD")} CDF`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-body-sm text-on-surface-variant font-mono">{item.reference ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant">
                {total} article{total > 1 ? "s" : ""}
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
    </DashboardShell>
  );
}
