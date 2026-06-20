"use client";

import { ReactNode, useMemo, useState } from "react";
import {
  SearchOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

export interface DataListColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataListProps<T> {
  items: T[];
  columns: DataListColumn<T>[];
  getRowKey: (item: T) => string | number;
  searchText?: (item: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  // Hauteur max de tout le composant (header recherche + corps + pagination) — le
  // corps devient scrollable au-delà, le composant ne dépasse jamais l'écran visible.
  maxHeight?: string;
  // Mode serveur : `items` est déjà la page courante (recherche/pagination faites
  // ailleurs, ex: useGraphQLRecords) — pas de filtre/slice local.
  serverMode?: boolean;
  totalCount?: number;
  loading?: boolean;
  onSearchChange?: (query: string) => void;
  onPageChange?: (page: number) => void;
  // Sans cadre (pas de bordure/coins arrondis/fond propre) — pour un conteneur qui a
  // déjà sa propre bordure (ex: dans un RightDrawer, éviter le cadre dans le cadre).
  bare?: boolean;
}

export function DataList<T>({
  items,
  columns,
  getRowKey,
  searchText,
  searchPlaceholder = "Rechercher…",
  pageSize = 10,
  emptyMessage = "Aucun résultat.",
  onRowClick,
  maxHeight = "max-h-[70vh]",
  serverMode = false,
  totalCount,
  loading = false,
  onSearchChange,
  onPageChange,
  bare = false,
}: DataListProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (serverMode || !normalizedQuery) return items;
    return items.filter((item) => searchText?.(item).toLowerCase().includes(normalizedQuery) ?? true);
  }, [items, normalizedQuery, searchText, serverMode]);

  const total = serverMode ? totalCount ?? items.length : filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = serverMode
    ? items
    : filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(0);
    onSearchChange?.(value);
    onPageChange?.(0);
  }

  function goToPage(nextPage: number) {
    setPage(nextPage);
    onPageChange?.(nextPage);
  }

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        bare ? "" : "rounded-2xl border border-outline-variant bg-surface-container-lowest"
      } ${maxHeight}`}
    >
      <div className="shrink-0 p-3 border-b border-outline-variant">
        <div className="relative">
          <SearchOutlined
            style={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-container-lowest">
            <tr className="border-b border-outline-variant text-left text-on-surface-variant">
              {columns.map((column) => (
                <th key={column.key} className={`px-5 py-3 font-medium ${column.className ?? ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item) => (
              <tr
                key={getRowKey(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={`border-b border-outline-variant last:border-0 ${
                  onRowClick ? "cursor-pointer hover:bg-surface-container transition-colors" : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-5 py-3 text-on-surface-variant ${column.className ?? ""}`}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-6 text-center text-on-surface-variant">
                  {loading ? "Chargement…" : emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-outline-variant text-sm text-on-surface-variant">
        <span>
          {total} résultat{total !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => goToPage(Math.max(0, currentPage - 1))}
            className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeftOutlined style={{ fontSize: 18 }} />
          </button>
          <span>
            Page {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage >= pageCount - 1}
            onClick={() => goToPage(Math.min(pageCount - 1, currentPage + 1))}
            className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRightOutlined style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
