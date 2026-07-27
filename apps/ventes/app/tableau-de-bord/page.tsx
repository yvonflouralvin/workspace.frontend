"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { KpiCard } from "@repo/ui/KpiCard";
import { BarChart } from "@repo/ui/charts/BarChart";
import { PieChart } from "@repo/ui/charts/PieChart";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listCommandes,
  listFactures,
  getFacturationConfig,
  type Commande,
  type Facture,
} from "@/lib/ventes-api";
import { STATUT_LABEL, STATUT_CHART_COLOR, formatMontant } from "@/lib/commande-ui";
import {
  PaidOutlined,
  ReceiptLongOutlined,
  ShoppingCartOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

const SECTION_LABEL = "text-label-sm uppercase text-outline";

/** Charge toutes les pages d'une liste paginée, bornées pour rester raisonnable. */
async function loadAll<T>(
  fetcher: (page: number) => Promise<{ items: T[]; pages: number }>,
  maxPages = 10
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let pages = 1;
  do {
    const data = await fetcher(page);
    all.push(...data.items);
    pages = data.pages;
    page += 1;
  } while (page <= pages && page <= maxPages);
  return all;
}

export default function FacturationDashboardPage() {
  const { can } = usePermissions();
  const canView = can("ventes.commandes.view");

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [devise, setDevise] = useState("FC");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    getFacturationConfig()
      .then((c) => setDevise(c.devise_base))
      .catch(() => {});
    Promise.all([
      loadAll<Commande>((page) => listCommandes({ page, page_size: 100 })).catch(() => []),
      loadAll<Facture>((page) => listFactures({ page, page_size: 100 })).catch(() => []),
    ])
      .then(([c, f]) => {
        setCommandes(c);
        setFactures(f);
      })
      .finally(() => setLoading(false));
  }, [canView]);

  const stats = useMemo(() => {
    const num = (v: string | number) => (typeof v === "number" ? v : Number(v) || 0);
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    const encaisse = factures
      .filter((f) => f.statut !== "ANNULEE")
      .reduce((s, f) => s + num(f.montant_paye), 0);
    const emis = factures
      .filter((f) => f.statut !== "ANNULEE" && f.statut !== "BROUILLON")
      .reduce((s, f) => s + num(f.montant_total), 0);
    const impayes = Math.max(0, emis - encaisse);

    const caMois = commandes
      .filter((c) => c.date_commande && new Date(c.date_commande) >= debutMois && c.statut !== "ANNULEE")
      .reduce((s, c) => s + num(c.montant_total), 0);

    const parStatut = new Map<string, number>();
    for (const c of commandes) {
      parStatut.set(c.statut, (parStatut.get(c.statut) ?? 0) + 1);
    }

    const parClient = new Map<string, number>();
    for (const c of commandes) {
      if (c.statut === "ANNULEE") continue;
      const key = c.client_nom ?? "Sans client";
      parClient.set(key, (parClient.get(key) ?? 0) + num(c.montant_total));
    }

    const echeances = factures
      .filter((f) => f.date_echeance && f.statut !== "PAYEE" && f.statut !== "ANNULEE")
      .sort((a, b) => (a.date_echeance ?? "").localeCompare(b.date_echeance ?? ""))
      .slice(0, 6);

    return { encaisse, impayes, caMois, parStatut, parClient, echeances };
  }, [commandes, factures]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
          <h1 className="font-display text-headline-md text-on-surface">Tableau de bord</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Vous n&apos;avez pas accès aux données de facturation.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const topClients = [...stats.parClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <div className="hidden md:block mb-6">
          <h1 className="font-display text-headline-md text-on-surface">Tableau de bord</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Activité commerciale du workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <KpiCard
            label="Chiffre d'affaires du mois"
            value={loading ? "—" : formatMontant(stats.caMois, devise)}
            icon={<PaidOutlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : "Commandes non annulées"}
          />
          <KpiCard
            label="Encaissé"
            value={loading ? "—" : formatMontant(stats.encaisse, devise)}
            icon={<ReceiptLongOutlined style={{ fontSize: 20 }} />}
            href="/factures"
          />
          <KpiCard
            label="Impayés"
            value={loading ? "—" : formatMontant(stats.impayes, devise)}
            icon={<WarningAmberOutlined style={{ fontSize: 20 }} />}
            hintTone={stats.impayes > 0 ? "negative" : "neutral"}
            hint={loading ? undefined : stats.impayes > 0 ? "Reste à encaisser" : "Tout est réglé"}
            href="/factures"
          />
          <KpiCard
            label="Commandes"
            value={loading ? "—" : commandes.length}
            icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
            href="/commandes"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section>
            <h2 className={`${SECTION_LABEL} mb-2.5`}>Répartition des commandes</h2>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
              {loading || stats.parStatut.size === 0 ? (
                <p className="text-body-sm text-on-surface-variant">Aucune commande.</p>
              ) : (
                <PieChart
                  data={[...stats.parStatut.entries()].map(([statut, value]) => ({
                    label: STATUT_LABEL[statut as keyof typeof STATUT_LABEL] ?? statut,
                    value,
                    color: STATUT_CHART_COLOR[statut as keyof typeof STATUT_CHART_COLOR] ?? "var(--color-outline)",
                  }))}
                />
              )}
            </div>
          </section>

          <section>
            <h2 className={`${SECTION_LABEL} mb-2.5`}>Meilleurs clients</h2>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
              {loading || topClients.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">Aucune donnée.</p>
              ) : (
                <BarChart data={topClients} unit={devise} height={200} />
              )}
            </div>
          </section>

          <section className="lg:col-span-2">
            <h2 className={`${SECTION_LABEL} mb-2.5`}>Échéances à venir</h2>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              {loading ? (
                <p className="px-4 py-6 text-body-sm text-on-surface-variant">Chargement…</p>
              ) : stats.echeances.length === 0 ? (
                <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
                  Aucune échéance en attente.
                </p>
              ) : (
                stats.echeances.map((f) => {
                  const enRetard =
                    f.date_echeance && new Date(f.date_echeance).getTime() < Date.now();
                  const reste = Number(f.montant_total) - Number(f.montant_paye);
                  return (
                    <Link
                      key={f.id}
                      href="/factures"
                      className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
                    >
                      <span className="font-mono text-label-md text-outline w-32 flex-none truncate">
                        {f.code}
                      </span>
                      <span className="flex-1 min-w-0 text-body-sm text-on-surface">
                        Reste {formatMontant(reste, devise)}
                      </span>
                      <span
                        className={`text-label-md font-semibold ${
                          enRetard ? "text-error" : "text-on-surface-variant"
                        }`}
                      >
                        {f.date_echeance
                          ? new Date(f.date_echeance).toLocaleDateString("fr-FR")
                          : "—"}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
