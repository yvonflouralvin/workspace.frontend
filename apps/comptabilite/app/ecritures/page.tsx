"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { DashboardShell } from "@/components/DashboardShell";
import { AideFlottante } from "@/components/AideFlottante";
import { AIDE_ECRITURES } from "@/components/aide-contenu";
import {
  listEcritures,
  listJournaux,
  listExercices,
  STATUT_ECRITURE_LABELS,
  type EcritureSummary,
  type Journal,
  type Exercice,
  type StatutEcriture,
} from "@/lib/compta-api";
import { AddOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUT_BADGE: Record<StatutEcriture, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  VALIDEE: "bg-member-active-container text-member-active",
  CONTREPASSEE: "bg-error-container text-error",
};

export default function EcrituresPage() {
  const { can } = usePermissions();
  const canSaisir = can("comptabilite.ecritures.saisir");

  const [ecritures, setEcritures] = useState<EcritureSummary[] | null>(null);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [journalFiltre, setJournalFiltre] = useState("");
  const [exerciceFiltre, setExerciceFiltre] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("");

  useEffect(() => {
    listJournaux().then(setJournaux);
    listExercices().then((list) => {
      setExercices(list);
      const ouvert = list.find((e) => e.statut === "OUVERT");
      if (ouvert) setExerciceFiltre(String(ouvert.id));
    });
  }, []);

  useEffect(() => {
    listEcritures({
      journal_id: journalFiltre ? Number(journalFiltre) : undefined,
      exercice_id: exerciceFiltre ? Number(exerciceFiltre) : undefined,
      statut: (statutFiltre as StatutEcriture) || undefined,
    }).then(setEcritures);
  }, [journalFiltre, exerciceFiltre, statutFiltre]);

  const journalLabel = useMemo(() => {
    const m = new Map(journaux.map((j) => [j.id, j.code]));
    return (id: number) => m.get(id) ?? `#${id}`;
  }, [journaux]);

  const columns = useMemo<DataListColumn<EcritureSummary>[]>(
    () => [
      { key: "numero", header: "Numéro", render: (e) => <span className="font-mono">{e.numero}</span> },
      { key: "journal", header: "Journal", render: (e) => journalLabel(e.journal_id) },
      { key: "date", header: "Date", render: (e) => e.date_ecriture },
      { key: "libelle", header: "Libellé", render: (e) => e.libelle },
      { key: "debit", header: "Débit", render: (e) => montant(e.total_debit) },
      { key: "credit", header: "Crédit", render: (e) => montant(e.total_credit) },
      {
        key: "statut",
        header: "Statut",
        render: (e) => (
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUT_BADGE[e.statut]}`}>
            {STATUT_ECRITURE_LABELS[e.statut]}
          </span>
        ),
      },
    ],
    [journalLabel],
  );

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Écritures</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Toutes les écritures comptables, brouillons compris.
            </p>
          </div>
          {canSaisir && (
            <Link
              href="/ecritures/nouvelle"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouvelle écriture
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <span className="block text-label-sm uppercase text-outline mb-1">Journal</span>
            <select value={journalFiltre} onChange={(e) => setJournalFiltre(e.target.value)} className={FIELD}>
              <option value="">Tous</option>
              {journaux.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}
            </select>
          </div>
          <div>
            <span className="block text-label-sm uppercase text-outline mb-1">Exercice</span>
            <select value={exerciceFiltre} onChange={(e) => setExerciceFiltre(e.target.value)} className={FIELD}>
              <option value="">Tous</option>
              {exercices.map((ex) => <option key={ex.id} value={ex.id}>{ex.libelle}</option>)}
            </select>
          </div>
          <div>
            <span className="block text-label-sm uppercase text-outline mb-1">Statut</span>
            <select value={statutFiltre} onChange={(e) => setStatutFiltre(e.target.value)} className={FIELD}>
              <option value="">Tous</option>
              {Object.entries(STATUT_ECRITURE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {ecritures === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <DataList
            items={ecritures}
            columns={columns}
            getRowKey={(e) => e.id}
            searchText={(e) => `${e.numero} ${e.libelle} ${e.reference ?? ""}`}
            searchPlaceholder="Rechercher une écriture…"
            pageSize={20}
            emptyMessage="Aucune écriture."
            onRowClick={(e) => { window.location.href = `/ecritures/${e.id}`; }}
          />
        )}
      </div>
      <AideFlottante titre={AIDE_ECRITURES.titre}>{AIDE_ECRITURES.contenu}</AideFlottante>
    </DashboardShell>
  );
}
