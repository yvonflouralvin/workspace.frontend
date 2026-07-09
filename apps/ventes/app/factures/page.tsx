"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { listFactures, type Facture, type StatutFacture } from "@/lib/ventes-api";
import { ReceiptLongOutlined } from "@mui/icons-material";

const PAGE_SIZE = 20;

const STATUT_COLORS: Record<StatutFacture, string> = {
  BROUILLON: "bg-surface-container-high text-on-surface-variant",
  EMISE: "bg-tertiary/10 text-tertiary",
  PAYEE: "bg-secondary/10 text-secondary",
  ANNULEE: "bg-error-container/50 text-error",
};

function formatMontant(v: string | number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FacturesPage() {
  const { can } = usePermissions();
  const canView = can("ventes.factures.view");

  const [items, setItems] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    listFactures({ page: 1, page_size: PAGE_SIZE })
      .then((data) => setItems(data.items))
      .catch(() => setError("Impossible de charger les factures."))
      .finally(() => setLoading(false));
  }, [canView]);

  return (
    <DashboardShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-headline-md font-display text-on-surface">Factures</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Factures de vente de ce workspace.
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
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium">Échéance</th>
                  <th className="px-5 py-3 font-medium text-right">Montant</th>
                  <th className="px-5 py-3 font-medium text-right">Payé</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3 font-mono text-label-md text-on-surface-variant">{f.code}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium ${STATUT_COLORS[f.statut]}`}>
                        {f.statut}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{f.date_echeance ?? "—"}</td>
                    <td className="px-5 py-3 text-on-surface text-right tabular-nums">{formatMontant(f.montant_total)}</td>
                    <td className="px-5 py-3 text-on-surface-variant text-right tabular-nums">{formatMontant(f.montant_paye)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
