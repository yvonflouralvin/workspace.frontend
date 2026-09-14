"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { DashboardShell } from "@/components/DashboardShell";
import { EcritureEditor } from "@/components/EcritureEditor";
import {
  getEcriture,
  deleteEcriture,
  validerEcriture,
  contrePasserEcriture,
  lettrerLignes,
  delettrerLigne,
  listJournaux,
  listExercices,
  STATUT_ECRITURE_LABELS,
  type Ecriture,
  type Journal,
  type Exercice,
} from "@/lib/compta-api";

function montant(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUT_BADGE: Record<string, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  VALIDEE: "bg-member-active-container text-member-active",
  CONTREPASSEE: "bg-error-container text-error",
};

export default function EcritureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const canSaisir = can("comptabilite.ecritures.saisir");
  const canValider = can("comptabilite.ecritures.valider");

  const [ecriture, setEcriture] = useState<Ecriture | null>(null);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aSupprimer, setASupprimer] = useState(false);
  const [aValider, setAValider] = useState(false);
  const [aContrepasser, setAContrepasser] = useState(false);
  const [selection, setSelection] = useState<number[]>([]);

  function reload() {
    getEcriture(Number(params.id)).then(setEcriture).catch((err) => setError(err.message));
  }

  useEffect(() => {
    reload();
    listJournaux().then(setJournaux);
    listExercices().then(setExercices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const journalCode = useMemo(() => {
    const j = ecriture ? journaux.find((x) => x.id === ecriture.journal_id) : null;
    return j?.code ?? "";
  }, [ecriture, journaux]);

  async function confirmerSuppression() {
    if (!ecriture) return;
    setBusy(true);
    try {
      await deleteEcriture(ecriture.id);
      router.push("/ecritures");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
      setASupprimer(false);
    }
  }

  async function confirmerValidation() {
    if (!ecriture) return;
    setBusy(true);
    try {
      const updated = await validerEcriture(ecriture.id);
      setEcriture(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
      setAValider(false);
    }
  }

  async function confirmerContrepassation() {
    if (!ecriture) return;
    setBusy(true);
    try {
      const mirror = await contrePasserEcriture(ecriture.id);
      router.push(`/ecritures/${mirror.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
      setAContrepasser(false);
    }
  }

  function toggleSelection(id: number) {
    setSelection((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function lettrer() {
    setError(null);
    setBusy(true);
    try {
      await lettrerLignes(selection);
      setSelection([]);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  async function delettrer(ligneId: number) {
    setBusy(true);
    try {
      await delettrerLigne(ligneId);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  if (error && !ecriture) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
          <p className="text-body-md text-error">{error}</p>
        </div>
      </DashboardShell>
    );
  }

  if (!ecriture) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        </div>
      </DashboardShell>
    );
  }

  if (ecriture.statut === "BROUILLON" && canSaisir) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="font-display text-headline-lg text-on-surface font-mono">{ecriture.numero}</h1>
              <p className="text-body-md text-on-surface-variant mt-0.5">Brouillon — modifiable.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setASupprimer(true)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-error hover:bg-error-container transition-colors">
                Supprimer
              </button>
              {canValider && (
                <button type="button" onClick={() => setAValider(true)} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors">
                  Valider
                </button>
              )}
            </div>
          </div>

          <EcritureEditor
            journaux={journaux}
            exercices={exercices}
            ecriture={ecriture}
            onSaved={(ec) => setEcriture(ec)}
          />

          {aSupprimer && (
            <ConfirmDialog
              title="Supprimer cette écriture ?"
              message="Le brouillon sera définitivement supprimé."
              confirmLabel="Supprimer"
              busy={busy}
              onConfirm={confirmerSuppression}
              onCancel={() => setASupprimer(false)}
            />
          )}
          {aValider && (
            <ConfirmDialog
              title="Valider cette écriture ?"
              message="Une fois validée, l'écriture devient immuable — seule une contre-passation pourra l'annuler."
              confirmLabel="Valider"
              busy={busy}
              onConfirm={confirmerValidation}
              onCancel={() => setAValider(false)}
            />
          )}
        </div>
      </DashboardShell>
    );
  }

  const lignesLettrables = ecriture.lignes.filter((l) => !l.lettrage);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface font-mono">{ecriture.numero}</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              {journalCode} · {ecriture.date_ecriture} · {ecriture.libelle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2.5 py-1 text-body-sm font-semibold ${STATUT_BADGE[ecriture.statut]}`}>
              {STATUT_ECRITURE_LABELS[ecriture.statut]}
            </span>
            {ecriture.statut === "VALIDEE" && canValider && (
              <button type="button" onClick={() => setAContrepasser(true)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-error hover:bg-error-container transition-colors">
                Contre-passer
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}

        {ecriture.ecriture_annulee_id && (
          <p className="text-body-sm text-on-surface-variant">
            Liée à l&rsquo;écriture{" "}
            <a href={`/ecritures/${ecriture.ecriture_annulee_id}`} className="text-primary hover:underline font-mono">
              #{ecriture.ecriture_annulee_id}
            </a>
            .
          </p>
        )}

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                  {ecriture.statut === "VALIDEE" && canValider && <th className="w-8" />}
                  <th className="text-left px-3 py-2">Compte</th>
                  <th className="text-left px-3 py-2">Libellé</th>
                  <th className="text-right px-3 py-2">Débit</th>
                  <th className="text-right px-3 py-2">Crédit</th>
                  <th className="text-left px-3 py-2">Lettrage</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {ecriture.lignes.map((l) => (
                  <tr key={l.id}>
                    {ecriture.statut === "VALIDEE" && canValider && (
                      <td className="px-3 py-2">
                        {!l.lettrage && (
                          <input
                            type="checkbox"
                            checked={selection.includes(l.id)}
                            onChange={() => toggleSelection(l.id)}
                          />
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono">{l.compte_numero} — {l.compte_libelle}</td>
                    <td className="px-3 py-2">{l.libelle ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{l.debit ? montant(l.debit) : ""}</td>
                    <td className="px-3 py-2 text-right">{l.credit ? montant(l.credit) : ""}</td>
                    <td className="px-3 py-2 font-mono">{l.lettrage ?? "—"}</td>
                    <td className="px-2 py-2">
                      {l.lettrage && canValider && (
                        <button type="button" onClick={() => delettrer(l.id)} className="text-label-sm text-outline hover:text-error transition-colors">
                          délettrer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-row-alt font-semibold">
                  <td className="px-3 py-2" colSpan={ecriture.statut === "VALIDEE" && canValider ? 3 : 2}>Totaux</td>
                  <td className="px-3 py-2 text-right">{montant(ecriture.total_debit)}</td>
                  <td className="px-3 py-2 text-right">{montant(ecriture.total_credit)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          {ecriture.statut === "VALIDEE" && canValider && lignesLettrables.length > 0 && (
            <div className="px-3 py-2 border-t border-hairline flex items-center gap-2">
              <button
                type="button"
                onClick={lettrer}
                disabled={selection.length < 2 || busy}
                className="h-8 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                Lettrer la sélection
              </button>
              <span className="text-label-md text-outline">Sélectionnez au moins deux lignes d&rsquo;un même compte, en équilibre.</span>
            </div>
          )}
        </div>

        {aContrepasser && (
          <ConfirmDialog
            title="Contre-passer cette écriture ?"
            message="Crée une écriture miroir (débit/crédit inversés) et marque celle-ci comme contre-passée. Irréversible."
            confirmLabel="Contre-passer"
            busy={busy}
            onConfirm={confirmerContrepassation}
            onCancel={() => setAContrepasser(false)}
          />
        )}
      </div>
    </DashboardShell>
  );
}
