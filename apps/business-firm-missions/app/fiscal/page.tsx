"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { listDossiers, echeancesAVenir, STATUT_ECHEANCE_LABELS, type DossierSummary, type Echeance } from "@/lib/bfm-fiscal-api";
import { AddOutlined, WarningAmberOutlined } from "@mui/icons-material";

export default function FiscalPage() {
  const [dossiers, setDossiers] = useState<DossierSummary[] | null>(null);
  const [echeances, setEcheances] = useState<Echeance[] | null>(null);

  useEffect(() => {
    listDossiers().then(setDossiers);
    echeancesAVenir(15).then(setEcheances);
  }, []);

  const columns = useMemo<DataListColumn<DossierSummary>[]>(
    () => [
      { key: "nom", header: "Dossier", render: (d) => d.nom },
      {
        key: "a_venir",
        header: "Échéances à venir (15j)",
        render: (d) => d.echeances_a_venir > 0 ? <span className="font-semibold">{d.echeances_a_venir}</span> : "—",
      },
      {
        key: "en_retard",
        header: "En retard",
        render: (d) => d.echeances_en_retard > 0 ? <span className="font-semibold text-error">{d.echeances_en_retard}</span> : "—",
      },
    ],
    [],
  );

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Assistance fiscale</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Dossiers fiscaux, obligations, échéances, déclarations.
            </p>
          </div>
          <Link
            href="/fiscal/nouveau"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouveau dossier fiscal
          </Link>
        </div>

        {echeances && echeances.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <p className="flex items-center gap-2 text-body-md font-semibold text-amber-900">
              <WarningAmberOutlined style={{ fontSize: 18 }} />
              Échéances fiscales à surveiller
            </p>
            <ul className="space-y-1">
              {echeances.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-body-sm text-amber-900">
                  <span className="flex-1">{e.nom}</span>
                  <span className="font-mono">{e.date_limite}</span>
                  <span className="text-label-sm uppercase">{STATUT_ECHEANCE_LABELS[e.statut]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {dossiers === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <DataList
            items={dossiers}
            columns={columns}
            getRowKey={(d) => d.id}
            searchText={(d) => d.nom}
            searchPlaceholder="Rechercher un dossier…"
            pageSize={20}
            emptyMessage="Aucun dossier fiscal."
            onRowClick={(d) => { window.location.href = `/fiscal/${d.id}`; }}
          />
        )}
      </div>
    </DashboardShell>
  );
}
