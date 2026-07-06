"use client";

import { useEffect, useState, useMemo } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { apiFetch } from "@repo/network/client";
import { SearchOutlined, LockOutlined, OpenInNewOutlined } from "@mui/icons-material";

interface AppEntry {
  id: number;
  key: string;
  name: string;
  description: string | null;
}

const PAGE_SIZE = 9;

const APP_META: Record<string, { color: string; url: string }> = {
  workspace: {
    color: "#3525cd",
    url: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005",
  },
  hr: {
    color: "#006c49",
    url: process.env.NEXT_PUBLIC_AUTH_API_HR_DOMAIN ?? "http://localhost:3003",
  },
  approval_flows: {
    color: "#004598",
    url: process.env.NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN ?? "http://localhost:3006",
  },
  hosto: {
    color: "#0e7490",
    url: process.env.NEXT_PUBLIC_AUTH_API_HOSTO_DOMAIN ?? "http://localhost:3007",
  },
  documents: {
    color: "#7c3aed",
    url: process.env.NEXT_PUBLIC_AUTH_API_DOCUMENTS_DOMAIN ?? "http://localhost:3008",
  },
};

function appInitial(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AppsPage() {
  const { can } = usePermissions();
  const isOwner = useSessionStore((s) => s.activeWorkspace?.is_owner ?? false);

  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiFetch("/api/apps")
      .then((r) => r.json())
      .then((data) => setApps(Array.isArray(data) ? data : []))
      .catch(() => setError("Impossible de charger les applications."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.key.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q)
    );
  }, [apps, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-md font-display text-on-surface">Applications</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Toutes les applications disponibles sur cette plateforme.
          </p>
        </div>
        <div className="relative w-64">
          <SearchOutlined
            style={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
          <input
            type="search"
            placeholder="Rechercher une application…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-body-sm text-on-surface-variant italic">
          {search ? `Aucune application ne correspond à « ${search} ».` : "Aucune application enregistrée."}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paged.map((app) => {
              const meta = APP_META[app.key];
              const hasAccess = isOwner || can(`${app.key}.access`);
              const Wrapper = hasAccess && meta?.url ? "a" : "div";
              const wrapperProps = hasAccess && meta?.url
                ? { href: meta.url }
                : {};

              return (
                <Wrapper
                  key={app.id}
                  {...wrapperProps}
                  className={[
                    "group flex flex-col gap-4 p-5 rounded-2xl border transition-all",
                    hasAccess
                      ? "bg-surface-container-lowest border-outline-variant hover:border-primary/40 hover:shadow-md cursor-pointer"
                      : "bg-surface-container-low border-outline-variant/50 opacity-60 cursor-default",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: meta?.color ?? "#777587" }}
                    >
                      {appInitial(app.name)}
                    </span>
                    <span
                      className={[
                        "inline-flex items-center gap-1 text-label-sm font-medium px-2 py-0.5 rounded-full",
                        hasAccess
                          ? "bg-secondary/10 text-secondary"
                          : "bg-surface-container text-on-surface-variant",
                      ].join(" ")}
                    >
                      {hasAccess ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
                          Accès
                        </>
                      ) : (
                        <>
                          <LockOutlined style={{ fontSize: 11 }} />
                          Restreint
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-body-md font-semibold text-on-surface">{app.name}</p>
                      {hasAccess && (
                        <OpenInNewOutlined
                          style={{ fontSize: 13 }}
                          className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                      {app.description ?? "Aucune description."}
                    </p>
                  </div>
                </Wrapper>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-body-sm text-on-surface-variant">
                {filtered.length} application{filtered.length > 1 ? "s" : ""}
                {search && ` pour « ${search} »`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  ← Précédent
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={[
                      "w-8 h-8 rounded-lg text-body-sm font-medium transition-colors",
                      n === currentPage
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
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
  );
}
