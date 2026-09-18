"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { listTiers, TYPE_LABELS, type TiersSummary } from "@/lib/tiers-api";
import { AddOutlined } from "@mui/icons-material";

export default function ClientsPage() {
  const [clients, setClients] = useState<TiersSummary[] | null>(null);

  useEffect(() => {
    listTiers({ page_size: 200 }).then((p) => setClients(p.items));
  }, []);

  const columns = useMemo<DataListColumn<TiersSummary>[]>(
    () => [
      { key: "code", header: "Code", render: (c) => <span className="font-mono">{c.code}</span> },
      { key: "nom", header: "Nom", render: (c) => c.nom },
      { key: "type", header: "Type", render: (c) => TYPE_LABELS[c.type] },
      { key: "secteur", header: "Secteur d'activité", render: (c) => c.secteur_activite ?? "—" },
      { key: "telephone", header: "Téléphone", render: (c) => c.telephone ?? "—" },
      {
        key: "statut",
        header: "Statut",
        render: (c) => (
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${c.is_active ? "bg-member-active-container text-member-active" : "bg-surface-container text-on-surface-variant"}`}>
            {c.is_active ? "Actif" : "Inactif"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Clients</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Recherche par nom, code, e-mail, téléphone, secteur d&rsquo;activité ou numéro d&rsquo;identification.
            </p>
          </div>
          <Link
            href="/clients/nouveau"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouveau client
          </Link>
        </div>

        {clients === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <DataList
            items={clients}
            columns={columns}
            getRowKey={(c) => c.id}
            searchText={(c) => `${c.code} ${c.nom} ${c.email ?? ""} ${c.telephone ?? ""} ${c.secteur_activite ?? ""}`}
            searchPlaceholder="Rechercher un client…"
            pageSize={20}
            emptyMessage="Aucun client."
            onRowClick={(c) => { window.location.href = `/clients/${c.id}`; }}
          />
        )}
      </div>
    </DashboardShell>
  );
}
