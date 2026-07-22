"use client";

import { ChevronLeftOutlined, ChevronRightOutlined } from "@mui/icons-material";

interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  onPageChange: (page: number) => void;
  label?: (total: number) => string;
  className?: string;
}

// Fenêtre de numéros autour de la page courante, avec ellipses — une liste de 50 pages
// ne doit pas rendre 50 boutons.
function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let n = start; n <= end; n++) out.push(n);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

export function Pagination({
  page,
  pages,
  total,
  onPageChange,
  label,
  className = "",
}: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <div className={`flex items-center justify-between gap-4 flex-wrap ${className}`}>
      <p className="text-body-sm text-on-surface-variant">
        {total !== undefined && label
          ? label(total)
          : total !== undefined
            ? `${total} résultat${total > 1 ? "s" : ""}`
            : ""}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-default transition-colors"
        >
          <ChevronLeftOutlined style={{ fontSize: 18 }} />
        </button>
        {pageWindow(page, pages).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="w-8 text-center text-body-sm text-on-surface-variant/60">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={n === page ? "page" : undefined}
              className={[
                "w-8 h-8 rounded-lg text-body-sm font-medium transition-colors",
                n === page
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container",
              ].join(" ")}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Page suivante"
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-default transition-colors"
        >
          <ChevronRightOutlined style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}
