"use client";

import { useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  ArrowBackOutlined,
  SearchOutlined,
  ScienceOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

type Prestation = {
  key: string;
  nom: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const PRESTATIONS: Prestation[] = [
  {
    key: "examens-medicaux",
    nom: "Examens Médicaux",
    description: "Catalogue des examens médicaux et leurs tarifs.",
    href: "/parametres/prestations/examens-medicaux",
    icon: <ScienceOutlined style={{ fontSize: 22 }} />,
  },
];

export default function PrestationsPage() {
  const { can } = usePermissions();
  const canManage = can("hosto.settings.manage");

  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const items = term
    ? PRESTATIONS.filter(
        (p) =>
          p.nom.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term),
      )
    : PRESTATIONS;

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Link
          href="/parametres"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux paramètres
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Catalogue des prestations</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Examens médicaux, actes et autres prestations facturables.
            </p>
          </div>
          <div className="relative w-64">
            <SearchOutlined
              style={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="search"
              placeholder="Rechercher une prestation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {!canManage && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission d&apos;accéder aux paramètres.
          </p>
        )}

        {canManage && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
            {items.length === 0 && (
              <p className="px-5 py-6 text-body-sm text-on-surface-variant">
                {search ? `Aucune prestation pour « ${search} ».` : "Aucune prestation."}
              </p>
            )}
            {items.map((p) => (
              <Link
                key={p.key}
                href={p.href}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
              >
                <span className="text-on-surface-variant">{p.icon}</span>
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
