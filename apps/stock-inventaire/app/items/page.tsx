"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { StockGauge } from "@/components/StockGauge";
import { LockedBadge } from "@repo/ui/LockedBadge";
import { ActiveFilters } from "@repo/ui/FilterBar";
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
      <div className="p-4 md:p-6 max-w-[1152px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="hidden md:block">
            <h1 className="text-headline-md font-display text-on-surface">Articles</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Catalogue des articles, produits et services du workspace.
            </p>
          </div>
          {canCreate && (
            <Link
              href="/items/new"
              className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
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

        <ActiveFilters
          filters={[
            ...selectedTypes.map((t) => ({
              key: t,
              label: TYPE_ITEM_LABELS[t],
              onClear: () => toggleType(t),
            })),
            ...(search ? [{ key: "q", label: `« ${search} »`, onClear: () => handleSearch("") }] : []),
          ]}
          onClearAll={() => {
            clearTypes();
            handleSearch("");
          }}
        />

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
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-soft overflow-hidden">
              <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
                <span className="w-24 flex-none">Code</span>
                <span className="flex-1">Article</span>
                <span className="w-[130px] flex-none">Type</span>
                <span className="w-[160px] flex-none">Stock</span>
                <span className="w-[120px] flex-none text-right">Prix</span>
              </div>

              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/items/${item.id}`)}
                  className={`w-full flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3.5 md:py-3 text-left border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors ${
                    item.owner_app_key ? "bg-locked-surface" : ""
                  } ${item.is_active ? "" : "opacity-60"}`}
                >
                  <span className="hidden md:block w-24 flex-none font-mono text-label-md text-outline">
                    {item.code}
                  </span>
                  <span className="w-full md:flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-body-md font-medium text-on-surface truncate">{item.nom}</span>
                      {item.owner_app_key && <LockedBadge appLabel={item.owner_app_key} />}
                    </span>
                    <span className="block text-label-md text-outline truncate">
                      <span className="md:hidden font-mono">{item.code} · </span>
                      {item.categorie_nom ?? "Sans catégorie"}
                      {item.reference ? ` · ${item.reference}` : ""}
                    </span>
                  </span>
                  <span className="md:w-[130px] flex-none">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLORS[item.type]}`}>
                      {TYPE_ITEM_LABELS[item.type]}
                    </span>
                  </span>
                  <span className="w-full md:w-[160px] flex-none">
                    <StockGauge item={item} />
                  </span>
                  <span className="md:w-[120px] flex-none md:text-right text-body-sm text-on-surface tabular-nums">
                    {item.est_vendu && item.prix_vente != null
                      ? `${Number(item.prix_vente).toLocaleString("fr-FR")} FC`
                      : "—"}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-body-sm text-outline">
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
