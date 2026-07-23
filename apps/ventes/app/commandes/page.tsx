"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { listCommandes, createCommande, listFactures, type Commande, type StatutCommande, type Facture } from "@/lib/ventes-api";
import { STATUTS, STATUT_LABEL, STATUT_CLASS, STATUT_CHART_COLOR } from "@/lib/commande-ui";
import { useDevise } from "@/components/DeviseProvider";
import { SearchField } from "@repo/ui/SearchField";
import { ActiveFilters } from "@repo/ui/FilterBar";
import { Pagination } from "@repo/ui/Pagination";
import { ShoppingCartOutlined, AddOutlined } from "@mui/icons-material";

const PAGE_SIZE = 20;

export default function CommandesPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const { format } = useDevise();
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
  const [factures, setFactures] = useState<Facture[]>([]);
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

  /** Part encaissée d'une commande, d'après ses factures. `null` = sans objet. */
  function paiement(c: Commande): number | null {
    if (c.statut === "BROUILLON" || c.statut === "ANNULEE") return null;
    const total = Number(c.montant_total) || 0;
    if (total <= 0) return null;
    const paye = factures
      .filter((f) => f.commande_id === c.id && f.statut !== "ANNULEE")
      .reduce((sum, f) => sum + (Number(f.montant_paye) || 0), 0);
    return Math.min(100, Math.round((paye / total) * 100));
  }

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    // Le taux d'encaissement d'une commande se lit sur ses factures : la liste
    // des commandes ne porte pas ses lignes.
    (async () => {
      const all: Facture[] = [];
      let page = 1;
      let pages = 1;
      try {
        do {
          const d = await listFactures({ page, page_size: 100 });
          all.push(...d.items);
          pages = d.pages;
          page += 1;
        } while (page <= pages && page <= 5);
        setFactures(all);
      } catch {
        /* la colonne Paiement se contente d'un tiret si les factures manquent */
      }
    })();
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
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-4">
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
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <SearchField
                value={client}
                onChange={handleClient}
                placeholder="Client…"
                className="w-full sm:w-[224px]"
              />
              {STATUTS.map((s) => {
                const on = statut === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => applyFilter({ statut: on ? "" : s.value })}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-body-sm font-semibold transition-colors ${
                      on
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className="w-[7px] h-[7px] rounded-full"
                      style={{ background: STATUT_CHART_COLOR[s.value] }}
                    />
                    {s.label}
                  </button>
                );
              })}
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface-variant">
                Du
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => applyFilter({ dateFrom: e.target.value })}
                  className="bg-transparent outline-none text-body-sm"
                />
              </label>
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface-variant">
                Au
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => applyFilter({ dateTo: e.target.value })}
                  className="bg-transparent outline-none text-body-sm"
                />
              </label>
            </div>

            <ActiveFilters
              filters={[
                ...(statut
                  ? [{ key: "statut", label: STATUT_LABEL[statut], onClear: () => applyFilter({ statut: "" }) }]
                  : []),
                ...(client ? [{ key: "client", label: `« ${client} »`, onClear: () => applyFilter({ client: "" }) }] : []),
                ...(dateFrom ? [{ key: "from", label: `Depuis ${dateFrom}`, onClear: () => applyFilter({ dateFrom: "" }) }] : []),
                ...(dateTo ? [{ key: "to", label: `Jusqu'au ${dateTo}`, onClear: () => applyFilter({ dateTo: "" }) }] : []),
              ]}
              onClearAll={() => applyFilter({ statut: "", client: "", dateFrom: "", dateTo: "" })}
            />
          </>
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
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              <div className="hidden md:flex items-center gap-3 xl:gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
                <span className="w-[110px] xl:w-[130px] flex-none">Code</span>
                <span className="flex-1 min-w-0">Client</span>
                <span className="hidden xl:block w-[150px] flex-none">Paiement</span>
                <span className="w-[100px] xl:w-[110px] flex-none">Statut</span>
                <span className="hidden xl:block w-[100px] flex-none">Date</span>
                <span className="w-[130px] xl:w-[160px] flex-none text-right">Montant</span>
              </div>

              {items.map((c, i) => {
                const pct = paiement(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/commandes/${c.id}`)}
                    className={`w-full block text-left border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors ${
                      i % 2 === 1 ? "bg-surface-row-alt" : ""
                    }`}
                  >
                    {/* Carte (mobile) et rangée (bureau) sont deux blocs distincts :
                        une seule rangée pilotée par des variantes md:/xl: retombait en
                        pile dès qu'une de ces règles manquait. */}
                    <span className="md:hidden block px-4 py-3 space-y-1.5">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-label-md font-medium text-primary">
                          {c.code}
                        </span>
                        <span
                          className={`inline-flex flex-none items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUT_CLASS[c.statut]}`}
                        >
                          {STATUT_LABEL[c.statut]}
                        </span>
                      </span>
                      <span className="block truncate text-body-md text-on-surface">
                        {c.client_nom ?? "—"}
                      </span>
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-mono text-label-md text-on-surface-variant">
                          {c.date_commande ?? "—"}
                        </span>
                        <span className="tabular-nums font-mono text-body-sm font-semibold text-on-surface">
                          {format(c.montant_total)}
                        </span>
                      </span>
                      {pct !== null && (
                        <span className="block pt-0.5">
                          <span className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-outline">Encaissé</span>
                            <span
                              className={`font-semibold ${pct >= 100 ? "text-member-active" : "text-on-surface-variant"}`}
                            >
                              {pct} %
                            </span>
                          </span>
                          <span className="block h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                            <span
                              className={`block h-full rounded-full ${pct >= 100 ? "bg-secondary" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                        </span>
                      )}
                    </span>

                    <span className="hidden md:flex items-center gap-3 xl:gap-4 px-5 py-3">
                      <span className="w-[110px] xl:w-[130px] flex-none truncate font-mono text-label-md font-medium text-primary">
                        {c.code}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-body-md text-on-surface">
                        {c.client_nom ?? "—"}
                      </span>

                      <span className="hidden xl:block w-[150px] flex-none">
                        {pct === null ? (
                          <span className="text-label-md text-outline">—</span>
                        ) : (
                          <>
                            <span className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-outline">Encaissé</span>
                              <span
                                className={`font-semibold ${pct >= 100 ? "text-member-active" : "text-on-surface-variant"}`}
                              >
                                {pct} %
                              </span>
                            </span>
                            <span className="block h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                              <span
                                className={`block h-full rounded-full ${pct >= 100 ? "bg-secondary" : "bg-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                          </>
                        )}
                      </span>

                      <span className="w-[100px] xl:w-[110px] flex-none">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUT_CLASS[c.statut]}`}
                        >
                          {STATUT_LABEL[c.statut]}
                        </span>
                      </span>
                      <span className="hidden xl:block w-[100px] flex-none whitespace-nowrap font-mono text-label-md text-on-surface-variant">
                        {c.date_commande ?? "—"}
                      </span>
                      <span className="w-[130px] xl:w-[160px] flex-none text-right whitespace-nowrap tabular-nums font-mono text-body-sm font-semibold text-on-surface">
                        {format(c.montant_total)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-1 min-w-0">
                <p className="text-body-sm text-on-surface-variant truncate">
                  {total} commande{total > 1 ? "s" : ""}
                </p>
                <Pagination page={page} pages={pages} onChange={handlePage} className="flex-none" />
              </div>
            )}
          </>
        )}
      </div>

    </DashboardShell>
  );
}
