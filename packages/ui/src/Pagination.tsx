"use client";

import { ChevronLeftOutlined, ChevronRightOutlined } from "@mui/icons-material";

// Fenêtre de numéros : première, dernière, courante ±1, ellipses au milieu.
// Rendre les `pages` numéros d'un coup fait déborder la barre dès ~15 pages.
function windowed(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set<number>([1, pages, page, page - 1, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - (nums[i - 1] as number) > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Pagination({
  page,
  pages,
  onChange,
  className = "",
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (pages <= 1) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        aria-label="Page précédente"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex-none inline-flex items-center gap-1 h-8 px-2 md:px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors"
      >
        <ChevronLeftOutlined style={{ fontSize: 16 }} />
        <span className="hidden md:inline">Précédent</span>
      </button>

      <span className="md:hidden px-2 text-body-sm text-on-surface-variant whitespace-nowrap">
        {page} / {pages}
      </span>

      <div className="hidden md:flex items-center gap-1">
        {windowed(page, pages).map((n, i) =>
          n === "…" ? (
            <span key={`gap-${i}`} className="w-5 text-center text-body-sm text-outline">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onChange(n)}
              className={`w-8 h-8 flex-none rounded-lg text-body-sm font-medium transition-colors ${
                n === page
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {n}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        aria-label="Page suivante"
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        className="flex-none inline-flex items-center gap-1 h-8 px-2 md:px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors"
      >
        <span className="hidden md:inline">Suivant</span>
        <ChevronRightOutlined style={{ fontSize: 16 }} />
      </button>
    </div>
  );
}
