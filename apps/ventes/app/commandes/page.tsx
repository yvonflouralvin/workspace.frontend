"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { listCommandes, createCommande, getFacturationConfig, type Commande, type StatutCommande } from "@/lib/ventes-api";
import { STATUTS, STATUT_LABEL, STATUT_CLASS, formatMontant } from "@/lib/commande-ui";
import { SearchOutlined, ShoppingCartOutlined, AddOutlined } from "@mui/icons-material";

const PAGE_SIZE = 20;

export default function CommandesPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("ventes.commandes.view");
  const canManage = can("ventes.commandes.manage");
  const [creating, setCreating] = useState(false);

  const [items, setItems] = useState<Commande[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [client, setClient] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statut, setStatut] = useState<StatutCommande | "">("");
  const [deviseBase, setDeviseBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  type Filters = { client: string; dateFrom: string; dateTo: string; statut: StatutCommande | "" };

  function fetchData(f: Filters, p: number) {
    setLoading(true);
    setError(null);
    listCommandes({
      client: f.client || undefined,
      date_from: f.dateFrom || undefined,
      date_to: f.dateTo || undefined,
      statut: f.statut || undefined,
      page: p,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les commandes."))
      .finally(() => setLoading(false));
  }

  const filters = (): Filters => ({ client, dateFrom, dateTo, statut });

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    getFacturationConfig().then((c) => setDeviseBase(c.devise_base)).catch(() => {});
    fetchData(filters(), page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  function handleClient(value: string) {
    setClient(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData({ client: value, dateFrom, dateTo, statut }, 1);
    }, 300);
  }

  function applyFilter(patch: Partial<Filters>) {
    const next = { client, dateFrom, dateTo, statut, ...patch };
    setClient(next.client); setDateFrom(next.dateFrom); setDateTo(next.dateTo); setStatut(next.statut);
    setPage(1);
    fetchData(next, 1);
  }

  function handlePage(p: number) {
    setPage(p);
    fetchData(filters(), p);
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const cmd = await createCommande();
      router.push(`/commandes/${cmd.id}`);
    } catch {
      setError("Impossible de créer la commande.");
      setCreating(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="hidden md:block">
            <h1 className="text-headline-md font-display text-on-surface">Commandes</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Commandes de vente de ce workspace.
            </p>
          </div>
          {canManage && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              {creating ? "Création…" : "Nouvelle commande"}
            </button>
          )}
        </div>

        {canView && (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="relative w-56">
              <SearchOutlined
                style={{ fontSize: 18 }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
              <input
                type="search"
                placeholder="Rechercher par client…"
                value={client}
                onChange={(e) => handleClient(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">Du</label>
              <input type="date" value={dateFrom} onChange={(e) => applyFilter({ dateFrom: e.target.value })}
                className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">Au</label>
              <input type="date" value={dateTo} onChange={(e) => applyFilter({ dateTo: e.target.value })}
                className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors" />
            </div>
            <select value={statut} onChange={(e) => applyFilter({ statut: e.target.value as StatutCommande | "" })}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors">
              <option value="">Tous les statuts</option>
              {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les commandes.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <ShoppingCartOutlined style={{ fontSize: 48, opacity: 0.4 }} />
            <p className="text-body-md">Aucune commande.</p>
          </div>
        )}

        {canView && !loading && !error && items.length > 0 && (
          <>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/commandes/${c.id}`)}
                      className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono text-label-md text-on-surface-variant">{c.code}</td>
                      <td className="px-5 py-3 text-on-surface font-medium">{c.client_nom ?? "—"}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{c.date_commande ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium ${STATUT_CLASS[c.statut]}`}>
                          {STATUT_LABEL[c.statut]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-on-surface text-right tabular-nums">{formatMontant(c.montant_total, deviseBase)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-body-sm text-on-surface-variant">
                  {total} commande{total > 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePage(page - 1)} disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors">
                    ← Précédent
                  </button>
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => handlePage(n)}
                      className={["w-8 h-8 rounded-lg text-body-sm font-medium transition-colors",
                        n === page ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"].join(" ")}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => handlePage(page + 1)} disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors">
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </DashboardShell>
  );
}
