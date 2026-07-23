"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { listFactures, listClients, type Facture, type StatutFacture, type Client } from "@/lib/ventes-api";
import { useDevise } from "@/components/DeviseProvider";
import { ReceiptLongOutlined } from "@mui/icons-material";

const PAGE_SIZE = 20;

const STATUT_COLORS: Record<StatutFacture, string> = {
  BROUILLON: "bg-role-member-container text-role-member",
  EMISE: "bg-role-admin-container text-role-admin",
  PAYEE: "bg-member-active-container text-member-active",
  ANNULEE: "bg-error-container text-on-error-container",
};

const STATUT_LABELS: Record<StatutFacture, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export default function FacturesPage() {
  const { can } = usePermissions();
  const canView = can("ventes.factures.view");

  const { format } = useDevise();
  const [items, setItems] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    listFactures({ page: 1, page_size: PAGE_SIZE })
      .then((data) => setItems(data.items))
      .catch(() => setError("Impossible de charger les factures."))
      .finally(() => setLoading(false));
    // Une facture ne porte que `client_id` : on résout les noms une fois.
    (async () => {
      const map: Record<number, string> = {};
      let page = 1;
      let pages = 1;
      try {
        do {
          const d = await listClients({ page, page_size: 100 });
          for (const c of d.items as Client[]) map[c.id] = c.nom;
          pages = d.pages;
          page += 1;
        } while (page <= pages && page <= 5);
        setClients(map);
      } catch {
        /* on retombe sur « Client #id » */
      }
    })();
  }, [canView]);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-5">
        <div className="hidden md:block">
          <h1 className="font-display text-headline-md text-on-surface">Factures</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Factures émises et leur statut de paiement.
          </p>
        </div>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les factures.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <ReceiptLongOutlined style={{ fontSize: 48, opacity: 0.4 }} />
            <p className="text-body-md">Aucune facture pour le moment.</p>
          </div>
        )}

        {canView && !loading && !error && items.length > 0 && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
              <span className="w-[150px] flex-none">Code</span>
              <span className="flex-1 min-w-0">Client</span>
              <span className="w-[110px] flex-none">Échéance</span>
              <span className="w-[110px] flex-none">Statut</span>
              <span className="w-[160px] flex-none text-right">Montant</span>
            </div>

            {items.map((f) => {
              const enRetard =
                f.date_echeance &&
                f.statut !== "PAYEE" &&
                f.statut !== "ANNULEE" &&
                new Date(f.date_echeance).getTime() < Date.now();
              return (
                <div
                  key={f.id}
                  className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
                >
                  <span className="w-full md:w-[150px] flex-none truncate font-mono text-label-md font-medium text-primary">
                    {f.code}
                  </span>
                  <span className="md:flex-1 md:min-w-0 truncate text-body-md text-on-surface">
                    {clients[f.client_id] ?? `Client #${f.client_id}`}
                  </span>
                  <span
                    className={`md:w-[110px] flex-none whitespace-nowrap font-mono text-label-md ${
                      enRetard ? "text-error font-semibold" : "text-on-surface-variant"
                    }`}
                  >
                    {f.date_echeance ?? "—"}
                  </span>
                  <span className="md:w-[110px] flex-none">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUT_COLORS[f.statut]}`}
                    >
                      {STATUT_LABELS[f.statut]}
                    </span>
                  </span>
                  <span className="md:w-[160px] flex-none md:text-right whitespace-nowrap tabular-nums font-mono text-body-sm font-semibold text-on-surface">
                    {format(f.montant_total)}
                    {Number(f.montant_paye) > 0 && Number(f.montant_paye) < Number(f.montant_total) && (
                      <span className="block text-[11px] font-normal text-outline">
                        payé {format(f.montant_paye)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

        )}
      </div>
    </DashboardShell>
  );
}
