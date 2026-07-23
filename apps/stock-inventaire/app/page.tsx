"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { KpiCard } from "@repo/ui/KpiCard";
import { BarChart } from "@repo/ui/charts/BarChart";
import { DashboardShell } from "@/components/DashboardShell";
import { StockGauge, stockState } from "@/components/StockGauge";
import { listItems, TYPE_ITEM_LABELS, type ItemSummary } from "@/lib/stock-api";
import {
  Inventory2Outlined,
  WarningAmberOutlined,
  PaidOutlined,
  CategoryOutlined,
} from "@mui/icons-material";

const SECTION_LABEL = "text-label-sm uppercase text-outline";

function formatMontant(v: number): string {
  return `${Math.round(v).toLocaleString("fr-FR")} FC`;
}

export default function StockHomePage() {
  const { can } = usePermissions();
  const canView = can("stock.items.view");

  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Le tableau de bord raisonne sur tout le catalogue : on parcourt les pages.
  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    (async () => {
      const all: ItemSummary[] = [];
      let page = 1;
      let pages = 1;
      try {
        do {
          const data = await listItems({ page, page_size: 100 });
          all.push(...data.items);
          pages = data.pages;
          page += 1;
        } while (page <= pages && page <= 20);
        setItems(all);
      } finally {
        setLoading(false);
      }
    })();
  }, [canView]);

  const stats = useMemo(() => {
    const gere = items.filter((i) => i.gestion_stock);
    const ruptures = gere.filter((i) => stockState(i) === "rupture");
    const bas = gere.filter((i) => stockState(i) === "bas");
    const valeur = items.reduce(
      (sum, i) => sum + (i.est_vendu && i.prix_vente ? Number(i.prix_vente) * i.stock_actuel : 0),
      0
    );
    const parCategorie = new Map<string, number>();
    for (const i of items) {
      const key = i.categorie_nom ?? "Sans catégorie";
      parCategorie.set(key, (parCategorie.get(key) ?? 0) + 1);
    }
    const parType = new Map<string, number>();
    for (const i of items) {
      parType.set(TYPE_ITEM_LABELS[i.type], (parType.get(TYPE_ITEM_LABELS[i.type]) ?? 0) + 1);
    }
    return { gere, ruptures, bas, valeur, parCategorie, parType };
  }, [items]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
          <h1 className="font-display text-headline-md text-on-surface">Inventaire</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Vous n&apos;avez pas accès au catalogue d&apos;articles.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const alertes = [...stats.ruptures, ...stats.bas].slice(0, 8);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <div className="hidden md:block mb-6">
          <h1 className="font-display text-headline-md text-on-surface">Inventaire</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            État du stock et alertes du workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <KpiCard
            label="Articles"
            value={loading ? "—" : items.length}
            icon={<Inventory2Outlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : `${stats.gere.length} en gestion de stock`}
            href="/items"
          />
          <KpiCard
            label="Ruptures"
            value={loading ? "—" : stats.ruptures.length}
            icon={<WarningAmberOutlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : stats.ruptures.length === 0 ? "Aucune rupture" : "À réapprovisionner"}
            hintTone={stats.ruptures.length > 0 ? "negative" : "neutral"}
          />
          <KpiCard
            label="Stock bas"
            value={loading ? "—" : stats.bas.length}
            icon={<WarningAmberOutlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : "Sous le minimum défini"}
          />
          <KpiCard
            label="Valeur du stock"
            value={loading ? "—" : formatMontant(stats.valeur)}
            icon={<PaidOutlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : "Articles vendus × stock"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          <section>
            <h2 className={`${SECTION_LABEL} mb-2.5`}>Alertes de stock</h2>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              {loading ? (
                <p className="px-4 py-6 text-body-sm text-on-surface-variant">Chargement…</p>
              ) : alertes.length === 0 ? (
                <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
                  Aucun article sous son minimum. 🎉
                </p>
              ) : (
                alertes.map((item) => (
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-body-md font-medium text-on-surface truncate">
                        {item.nom}
                      </span>
                      <span className="block font-mono text-label-md text-outline">{item.code}</span>
                    </span>
                    <span className="w-[160px] flex-none">
                      <StockGauge item={item} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <section>
              <h2 className={`${SECTION_LABEL} mb-2.5`}>Répartition par type</h2>
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                {loading || stats.parType.size === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">—</p>
                ) : (
                  <BarChart
                    data={[...stats.parType.entries()].map(([label, value]) => ({ label, value }))}
                    height={150}
                  />
                )}
              </div>
            </section>

            <section>
              <h2 className={`${SECTION_LABEL} mb-2.5`}>Catégories</h2>
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
                {loading || stats.parCategorie.size === 0 ? (
                  <p className="px-4 py-4 text-body-sm text-on-surface-variant">—</p>
                ) : (
                  [...stats.parCategorie.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([label, count]) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-hairline last:border-b-0"
                      >
                        <CategoryOutlined style={{ fontSize: 16 }} className="flex-none text-outline" />
                        <span className="flex-1 min-w-0 truncate text-body-sm text-on-surface">
                          {label}
                        </span>
                        <span className="text-label-md font-semibold text-outline">{count}</span>
                      </div>
                    ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
