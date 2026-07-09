"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateClientDrawer } from "@/components/CreateClientDrawer";
import { listClients, type Client } from "@/lib/ventes-api";
import { SearchOutlined, PeopleAltOutlined, AddOutlined } from "@mui/icons-material";

const PAGE_SIZE = 20;

export default function ClientsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("ventes.clients.view");
  const canManage = can("ventes.clients.manage");
  const [showCreate, setShowCreate] = useState(false);

  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef(search);

  function fetchData(q: string, p: number) {
    setLoading(true);
    setError(null);
    listClients({ q: q || undefined, page: p, page_size: PAGE_SIZE })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les clients."))
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

  return (
    <DashboardShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Clients</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Clients de ce workspace. Chaque client peut être publié dans Tiers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canView && (
              <div className="relative w-64">
                <SearchOutlined
                  style={{ fontSize: 18 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <input
                  type="search"
                  placeholder="Nom du client…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}
            {canManage && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0"
              >
                <AddOutlined style={{ fontSize: 18 }} />
                Nouveau client
              </button>
            )}
          </div>
        </div>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les clients.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <PeopleAltOutlined style={{ fontSize: 48, opacity: 0.4 }} />
            <p className="text-body-md">
              {search ? `Aucun résultat pour « ${search} ».` : "Aucun client."}
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
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Téléphone</th>
                    <th className="px-5 py-3 font-medium">Ville</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 text-on-surface font-medium">{c.nom}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{c.email ?? "—"}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{c.telephone ?? "—"}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{c.adresse_ville ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-body-sm text-on-surface-variant">
                  {total} client{total > 1 ? "s" : ""}{search && ` pour « ${search} »`}
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
        <CreateClientDrawer
          onClose={() => setShowCreate(false)}
          onCreated={() => { setPage(1); fetchData(search, 1); }}
        />
      )}
    </DashboardShell>
  );
}
