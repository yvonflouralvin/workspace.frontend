"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { AddOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listNotesFrais,
  STATUT_NOTE_LABELS,
  TYPE_NOTE_LABELS,
  type NoteFraisSummary,
  type StatutNoteFrais,
} from "@/lib/compta-api";

const STATUT_BADGE: Record<StatutNoteFrais, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  SOUMISE: "bg-primary/10 text-primary",
  APPROUVEE: "bg-member-active-container text-member-active",
  REFUSEE: "bg-error-container text-error",
  PAYEE: "bg-member-active-container text-member-active",
  ANNULEE: "bg-surface-container text-outline",
};

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NotesFraisPage() {
  const { can } = usePermissions();
  const canSaisir = can("comptabilite.notes_frais.saisir");
  const canGerer = can("comptabilite.notes_frais.manage");

  const [notes, setNotes] = useState<NoteFraisSummary[]>([]);
  const [statut, setStatut] = useState<StatutNoteFrais | "">("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    listNotesFrais(statut ? { statut } : undefined)
      .then(setNotes)
      .finally(() => setChargement(false));
  }, [statut]);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Notes de frais</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              {canGerer
                ? "Toutes les demandes d'avance et de remboursement de l'espace."
                : "Vos demandes d'avance et de remboursement."}
            </p>
          </div>
          {canSaisir && (
            <Link
              href="/notes-frais/nouvelle"
              className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouvelle note
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as StatutNoteFrais | "")}
            className="rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          >
            <option value="">Tous les états</option>
            {Object.entries(STATUT_NOTE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          {chargement ? (
            <p className="px-4 py-6 text-body-md text-on-surface-variant">Chargement…</p>
          ) : notes.length === 0 ? (
            <p className="px-4 py-6 text-body-md text-on-surface-variant">
              Aucune note de frais{statut ? ` dans l'état « ${STATUT_NOTE_LABELS[statut]} »` : ""}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                    <th className="text-left px-3 py-2">Numéro</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Objet</th>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-right px-3 py-2">Montant</th>
                    <th className="text-left px-3 py-2">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {notes.map((n) => (
                    <tr key={n.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-3 py-2 font-mono">
                        <Link href={`/notes-frais/${n.id}`} className="text-primary hover:underline">
                          {n.numero}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{TYPE_NOTE_LABELS[n.type_note]}</td>
                      <td className="px-3 py-2">{n.objet}</td>
                      <td className="px-3 py-2">{n.date_demande}</td>
                      <td className="px-3 py-2 text-right">{montant(n.montant_total)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUT_BADGE[n.statut]}`}>
                          {STATUT_NOTE_LABELS[n.statut]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
