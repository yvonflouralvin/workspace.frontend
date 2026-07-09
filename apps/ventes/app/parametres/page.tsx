"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { listParametres, type Parametre } from "@/lib/ventes-api";
import {
  SearchOutlined,
  PaidOutlined,
  PercentOutlined,
  BusinessOutlined,
  SettingsOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

const ICONS: Record<string, React.ReactNode> = {
  devise: <PaidOutlined style={{ fontSize: 22 }} />,
  tva: <PercentOutlined style={{ fontSize: 22 }} />,
  organisation: <BusinessOutlined style={{ fontSize: 22 }} />,
};

export default function ParametresPage() {
  const { can } = usePermissions();
  const canManage = can("ventes.settings.manage");

  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    listParametres()
      .then(setParametres)
      .catch(() => setError("Impossible de charger les paramètres."))
      .finally(() => setLoading(false));
  }, [canManage]);

  const term = search.trim().toLowerCase();
  const items = term
    ? parametres.filter(
        (p) =>
          p.nom.toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term),
      )
    : parametres;

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Paramètres</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Configuration de Vente/Facturation pour ce workspace.
            </p>
          </div>
          <div className="relative w-64">
            <SearchOutlined
              style={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="search"
              placeholder="Rechercher un paramètre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {!canManage && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de gérer les paramètres.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canManage && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canManage && !loading && !error && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
            {items.length === 0 && (
              <p className="px-5 py-6 text-body-sm text-on-surface-variant">
                {search ? `Aucun paramètre pour « ${search} ».` : "Aucun paramètre."}
              </p>
            )}
            {items.map((p) => (
              <Link
                key={p.cle}
                href={`/parametres/${p.cle}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
              >
                <span className="text-on-surface-variant">
                  {ICONS[p.cle] ?? <SettingsOutlined style={{ fontSize: 22 }} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-medium text-on-surface">{p.nom}</p>
                  <p className="text-body-sm text-on-surface-variant">{p.description}</p>
                </div>
                <ChevronRightOutlined style={{ fontSize: 20 }} className="text-on-surface-variant shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
