"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Avatar } from "@repo/ui/Avatar";
import { SearchField } from "@repo/ui/SearchField";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateClientDrawer } from "@/components/CreateClientDrawer";
import { useDevise } from "@/components/DeviseProvider";
import { listClients, listCommandes, type Client, type Commande } from "@/lib/ventes-api";
import {
  PeopleAltOutlined,
  AddOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

const PAGE_SIZE = 20;

export default function ClientsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { format } = useDevise();
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
  const [commandes, setCommandes] = useState<Commande[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!canView) {
      setLoading(false);
      return;
    }
    fetchData(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  // L'API clients ne porte ni compteur de commandes ni chiffre d'affaires :
  // on les agrège depuis les commandes, comme le fait le tableau de bord.
  useEffect(() => {
    if (!canView || !can("ventes.commandes.view")) return;
    (async () => {
      const all: Commande[] = [];
      let p = 1;
      let totalPages = 1;
      try {
        do {
          const data = await listCommandes({ page: p, page_size: 100 });
          all.push(...data.items);
          totalPages = data.pages;
          p += 1;
        } while (p <= totalPages && p <= 10);
        setCommandes(all);
      } catch {
        /* l'agrégat est un bonus : son absence ne casse pas la liste */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const parClient = useMemo(() => {
    const map = new Map<number, { count: number; ca: number }>();
    for (const c of commandes) {
      if (c.client_id === null || c.statut === "ANNULEE") continue;
      const entry = map.get(c.client_id) ?? { count: 0, ca: 0 };
      entry.count += 1;
      entry.ca += Number(c.montant_total) || 0;
      map.set(c.client_id, entry);
    }
    return map;
  }, [commandes]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData(value, 1);
    }, 300);
  }

  function goToPage(p: number) {
    setPage(p);
    fetchData(search, p);
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="hidden md:block flex-1">
            <h1 className="font-display text-headline-md text-on-surface">Clients</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Clients de facturation de ce workspace.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouveau client
            </button>
          )}
        </div>

        {canView && (
          <SearchField
            value={search}
            onChange={handleSearch}
            placeholder="Nom, email, téléphone…"
            className="w-full md:w-[300px]"
          />
        )}

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les clients.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {canView && loading && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 md:px-5 py-3.5 border-b border-hairline">
                <div className="w-8 h-8 rounded-full bg-surface-container-low animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 rounded bg-surface-container-low animate-pulse" />
                  <div className="h-2.5 w-32 rounded bg-surface-container-low animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {canView && !loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <PeopleAltOutlined style={{ fontSize: 48 }} className="text-outline-variant" />
            <p className="text-body-md">
              {search ? `Aucun résultat pour « ${search} ».` : "Aucun client enregistré."}
            </p>
          </div>
        )}

        {canView && !loading && !error && items.length > 0 && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
              <span className="flex-1">Client</span>
              <span className="w-[130px] flex-none">Ville</span>
              <span className="w-[90px] flex-none text-center">Commandes</span>
              <span className="w-[150px] flex-none text-right">CA total</span>
            </div>

            {items.map((c) => {
              const agg = parClient.get(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className="w-full flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3.5 md:py-3 text-left border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
                >
                  <span className="w-full md:flex-1 min-w-0 flex items-center gap-3">
                    <Avatar name={c.nom} letters={1} size={32} color="var(--color-secondary)" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-body-md font-medium text-on-surface truncate">
                          {c.nom}
                        </span>
                        {c.crm_client_id && (
                          <span className="rounded-md bg-role-admin-container px-1.5 py-0.5 text-[11px] font-semibold text-role-admin">
                            Tiers
                          </span>
                        )}
                      </span>
                      <span className="block text-label-md text-outline truncate">
                        {c.email ?? c.telephone ?? "—"}
                      </span>
                    </span>
                  </span>

                  <span className="md:w-[130px] flex-none text-body-sm text-on-surface-variant">
                    {c.adresse_ville ?? "—"}
                  </span>
                  <span className="md:w-[90px] flex-none md:text-center text-body-sm text-on-surface tabular-nums">
                    {agg ? agg.count : "—"}
                  </span>
                  <span className="md:w-[150px] flex-none md:text-right font-mono text-body-sm font-semibold text-on-surface">
                    {agg ? format(agg.ca) : "—"}
                  </span>
                </button>
              );
            })}

            <div className="flex items-center justify-between px-4 md:px-5 py-3 text-body-sm text-outline">
              <span>
                {total} client{total > 1 ? "s" : ""}
                {search && ` pour « ${search} »`}
              </span>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <PageButton label="Précédent" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                    <ChevronLeftOutlined style={{ fontSize: 15 }} />
                  </PageButton>
                  <span className="px-2 text-label-md">
                    {page} / {pages}
                  </span>
                  <PageButton
                    label="Suivant"
                    disabled={page === pages}
                    onClick={() => goToPage(page + 1)}
                  >
                    <ChevronRightOutlined style={{ fontSize: 15 }} />
                  </PageButton>
                </div>
              )}
            </div>
          </div>
        )}

        {showCreate && (
          <CreateClientDrawer
            onClose={() => setShowCreate(false)}
            onCreated={() => fetchData(search, page)}
          />
        )}
      </div>
    </DashboardShell>
  );
}

function PageButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  );
}
