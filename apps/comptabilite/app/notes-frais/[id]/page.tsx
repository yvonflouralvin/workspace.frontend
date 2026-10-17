"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { DashboardShell } from "@/components/DashboardShell";
import { NoteFraisEditor } from "@/components/NoteFraisEditor";
import {
  getNoteFrais,
  soumettreNoteFrais,
  annulerNoteFrais,
  payerNoteFrais,
  listExercices,
  listComptes,
  urlJustificatif,
  STATUT_NOTE_LABELS,
  TYPE_NOTE_LABELS,
  type Compte,
  type Exercice,
  type NoteFrais,
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

export default function NoteFraisDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const canSaisir = can("comptabilite.notes_frais.saisir");
  const canGerer = can("comptabilite.notes_frais.manage");

  const [note, setNote] = useState<NoteFrais | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [tresorerie, setTresorerie] = useState<Compte[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enEdition, setEnEdition] = useState(false);
  const [aSoumettre, setASoumettre] = useState(false);
  const [aAnnuler, setAAnnuler] = useState(false);
  const [aPayer, setAPayer] = useState(false);
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10));
  const [compteTresorerie, setCompteTresorerie] = useState("");

  useEffect(() => {
    getNoteFrais(Number(params.id)).then(setNote).catch((e) => setError(e.message));
    listExercices().then(setExercices);
    // Classe 5 : trésorerie. Rembourser depuis un compte de charge n'aurait
    // pas de sens, et la liste complète du plan comptable noierait le choix.
    listComptes({ classe: 5, actif: true }).then(setTresorerie);
  }, [params.id]);

  async function agir(action: () => Promise<NoteFrais>, apres?: () => void) {
    setError(null);
    setBusy(true);
    try {
      setNote(await action());
      apres?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  if (error && !note) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
          <p className="text-body-md text-error">{error}</p>
        </div>
      </DashboardShell>
    );
  }

  if (!note) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        </div>
      </DashboardShell>
    );
  }

  if (enEdition && note.statut === "BROUILLON") {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
          <h1 className="font-display text-headline-lg text-on-surface font-mono">{note.numero}</h1>
          <NoteFraisEditor
            exercices={exercices}
            note={note}
            onSaved={(n) => {
              setNote(n);
              setEnEdition(false);
            }}
            onCancel={() => setEnEdition(false)}
          />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface font-mono">{note.numero}</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              {TYPE_NOTE_LABELS[note.type_note]} · {note.date_demande} · {note.objet}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-md px-2.5 py-1 text-body-sm font-semibold ${STATUT_BADGE[note.statut]}`}>
              {STATUT_NOTE_LABELS[note.statut]}
            </span>
            {note.statut === "BROUILLON" && canSaisir && (
              <>
                <button type="button" onClick={() => setEnEdition(true)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
                  Modifier
                </button>
                <button type="button" onClick={() => setASoumettre(true)} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors">
                  Soumettre
                </button>
              </>
            )}
            {(note.statut === "BROUILLON" || note.statut === "SOUMISE") && canSaisir && (
              <button type="button" onClick={() => setAAnnuler(true)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-error hover:bg-error-container transition-colors">
                Retirer la demande
              </button>
            )}
            {note.statut === "APPROUVEE" && canGerer && (
              <button type="button" onClick={() => setAPayer(true)} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors">
                Enregistrer le paiement
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}

        {note.statut === "SOUMISE" && (
          <p className="rounded-lg border border-outline-soft bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
            En attente du circuit de validation défini par votre organisation. Les approbateurs la
            trouvent dans Validations.
          </p>
        )}
        {note.statut === "REFUSEE" && note.motif_decision && (
          <p className="rounded-lg border border-error-container bg-error-container/30 px-3 py-2 text-body-sm text-error">
            Refusée : {note.motif_decision}
          </p>
        )}
        {note.ecriture_id && (
          <p className="text-body-sm text-on-surface-variant">
            Écriture engendrée, en brouillon :{" "}
            <Link href={`/ecritures/${note.ecriture_id}`} className="text-primary hover:underline font-mono">
              #{note.ecriture_id}
            </Link>
            . Elle attend votre validation — approuver une dépense n&rsquo;est pas la passer en comptabilité.
          </p>
        )}
        {note.paye_le && (
          <p className="text-body-sm text-on-surface-variant">Payée le {note.paye_le}.</p>
        )}

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Compte</th>
                  <th className="text-left px-3 py-2">Dépense</th>
                  <th className="text-right px-3 py-2">Montant</th>
                  <th className="text-left px-3 py-2">Justificatif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {note.lignes.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.date_depense}</td>
                    <td className="px-3 py-2 font-mono">{l.compte_numero} — {l.compte_libelle}</td>
                    <td className="px-3 py-2">{l.libelle}</td>
                    <td className="px-3 py-2 text-right">{montant(l.montant)}</td>
                    <td className="px-3 py-2">
                      {l.document_id ? (
                        <a
                          href={urlJustificatif(note.id, l.document_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Voir la pièce
                        </a>
                      ) : (
                        <span className="text-outline">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-row-alt font-semibold">
                  <td className="px-3 py-2" colSpan={3}>Total</td>
                  <td className="px-3 py-2 text-right">{montant(note.montant_total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {aSoumettre && (
          <ConfirmDialog
            title="Soumettre cette note ?"
            message="Elle part dans le circuit de validation défini par votre organisation. Vous ne pourrez plus la modifier — les approbateurs auront vu ce montant."
            confirmLabel="Soumettre"
            tone="primary"
            busy={busy}
            onConfirm={() => agir(() => soumettreNoteFrais(note.id), () => setASoumettre(false))}
            onCancel={() => setASoumettre(false)}
          />
        )}

        {aAnnuler && (
          <ConfirmDialog
            title="Retirer cette demande ?"
            message="Elle sera marquée annulée — ce n'est pas un refus, et votre historique le distingue."
            confirmLabel="Retirer"
            busy={busy}
            onConfirm={() => agir(() => annulerNoteFrais(note.id), () => setAAnnuler(false))}
            onCancel={() => setAAnnuler(false)}
          />
        )}

        {aPayer && (
          <ConfirmDialog
            title="Enregistrer le paiement ?"
            tone="primary"
            message={
              <div className="space-y-2">
                <p>Depuis quel compte de trésorerie, et à quelle date ?</p>
                <input
                  type="date"
                  value={datePaiement}
                  onChange={(e) => setDatePaiement(e.target.value)}
                  className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
                />
                <select
                  value={compteTresorerie}
                  onChange={(e) => setCompteTresorerie(e.target.value)}
                  className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
                >
                  <option value="">Choisir un compte…</option>
                  {tresorerie.map((c) => (
                    <option key={c.id} value={c.id}>{c.numero} — {c.libelle}</option>
                  ))}
                </select>
              </div>
            }
            confirmLabel="Enregistrer"
            busy={busy}
            confirmDisabled={!compteTresorerie}
            onConfirm={() =>
              agir(
                () =>
                  payerNoteFrais(note.id, {
                    date_paiement: datePaiement,
                    compte_tresorerie_id: Number(compteTresorerie),
                  }),
                () => setAPayer(false),
              )
            }
            onCancel={() => setAPayer(false)}
          />
        )}
      </div>
    </DashboardShell>
  );
}
