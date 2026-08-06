"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  ArrowBackOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  ContentCopyOutlined,
  DeleteOutlineOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import { ConflitDialog } from "@/components/ConflitDialog";
import { FormulaireAffectation } from "@/components/FormulaireAffectation";
import {
  ConflitError,
  TEINTES_TYPE,
  heureCourte,
  isoJour,
  lundiDe,
  operationsApi,
  type Affectation,
  type Conflit,
  type Planning,
} from "@/lib/operations-api";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function PlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const planningId = Number(id);
  const { can } = usePermissions();
  const peutAffecter = can("operations.affectations.manage");

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [affectations, setAffectations] = useState<Affectation[] | null>(null);
  const [semaine, setSemaine] = useState(() => lundiDe(new Date()));
  const [ajout, setAjout] = useState<{ jour: Date } | null>(null);
  const [conflit, setConflit] = useState<{ conflit: Conflit; reessayer: (m: string) => void } | null>(null);
  const [aSupprimer, setASupprimer] = useState<Affectation | null>(null);
  const [duplication, setDuplication] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const fin = useMemo(() => {
    const d = new Date(semaine);
    d.setDate(d.getDate() + 7);
    return d;
  }, [semaine]);

  const charger = useCallback(async () => {
    try {
      const [plannings, lignes] = await Promise.all([
        operationsApi.plannings(),
        operationsApi.affectations({
          planning_id: planningId,
          depuis: semaine.toISOString(),
          jusqu_a: fin.toISOString(),
        }),
      ]);
      setPlanning(plannings.find((p) => p.id === planningId) ?? null);
      setAffectations(lignes);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger le planning.");
      setAffectations([]);
    }
  }, [planningId, semaine, fin]);

  useEffect(() => {
    void charger();
  }, [charger]);

  /** Les sept colonnes de la semaine. Une affectation qui déborde d'un jour sur
   *  l'autre apparaît dans la colonne de son DÉBUT — la découper visuellement
   *  ferait croire à deux prestations. */
  const parJour = useMemo(() => {
    const cases: Affectation[][] = [[], [], [], [], [], [], []];
    for (const a of affectations ?? []) {
      const index = Math.floor(
        (new Date(a.debut).setHours(0, 0, 0, 0) - semaine.getTime()) / 86_400_000,
      );
      if (index >= 0 && index < 7) cases[index].push(a);
    }
    return cases.map((jour) => jour.sort((x, y) => x.debut.localeCompare(y.debut)));
  }, [affectations, semaine]);

  async function poser(corps: Record<string, unknown>) {
    setEnCours(true);
    try {
      await operationsApi.creerAffectation({ ...corps, planning_id: planningId });
      setAjout(null);
      setConflit(null);
      setToast("Affectation créée.");
      await charger();
    } catch (e) {
      if (e instanceof ConflitError) {
        setConflit({
          conflit: e.conflit,
          reessayer: (motif) => void poser({ ...corps, motif_forcage: motif }),
        });
      } else {
        setErreur(e instanceof Error ? e.message : "Création impossible.");
      }
    } finally {
      setEnCours(false);
    }
  }

  const decaler = (jours: number) => {
    const d = new Date(semaine);
    d.setDate(d.getDate() + jours);
    setSemaine(d);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1200px] p-4 md:p-8">
        <Link
          href="/plannings"
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Plannings
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-headline-md text-on-surface">
              {planning && (
                <span
                  className="h-6 w-1.5 rounded-full"
                  style={{ backgroundColor: TEINTES_TYPE[planning.type] }}
                />
              )}
              {planning?.nom ?? "…"}
            </h1>
            {planning && (
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Applicable du {new Date(planning.debut).toLocaleDateString("fr-FR")} au{" "}
                {new Date(planning.fin).toLocaleDateString("fr-FR")}
                {planning.chevauchements_count > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-error">
                    <WarningAmberOutlined style={{ fontSize: 14 }} />
                    {planning.chevauchements_count} en chevauchement
                  </span>
                )}
              </p>
            )}
          </div>
          {peutAffecter && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDuplication(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                <ContentCopyOutlined style={{ fontSize: 16 }} />
                Dupliquer la semaine
              </button>
              <button
                type="button"
                onClick={() => setAjout({ jour: semaine })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Affecter
              </button>
            </div>
          )}
        </div>

        {/* Navigation de semaine */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => decaler(-7)}
            aria-label="Semaine précédente"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <ChevronLeftOutlined style={{ fontSize: 18 }} />
          </button>
          <p className="text-body-md text-on-surface">
            Semaine du {semaine.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
          </p>
          <button
            type="button"
            onClick={() => decaler(7)}
            aria-label="Semaine suivante"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <ChevronRightOutlined style={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            onClick={() => setSemaine(lundiDe(new Date()))}
            className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Cette semaine
          </button>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {/* Une colonne par jour. Sur mobile, elles s'empilent — sept colonnes en
            390 pt donneraient des bandes illisibles. */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {JOURS.map((nom, index) => {
            const jour = new Date(semaine);
            jour.setDate(jour.getDate() + index);
            const lignes = parJour[index] ?? [];
            return (
              <div
                key={nom}
                className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-2"
              >
                <p className="px-1 pb-2 text-label-md text-on-surface-variant">
                  {nom} {jour.getDate()}
                  {lignes.length > 0 && (
                    <span className="ml-1 text-outline-variant">{lignes.length}</span>
                  )}
                </p>
                <div className="flex flex-col gap-1.5">
                  {lignes.length === 0 ? (
                    <button
                      type="button"
                      disabled={!peutAffecter}
                      onClick={() => setAjout({ jour })}
                      className="rounded-lg border border-dashed border-outline-soft px-2 py-3 text-label-md text-outline transition-colors hover:bg-surface-container-low disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      {peutAffecter ? "Affecter" : "—"}
                    </button>
                  ) : (
                    lignes.map((a) => (
                      <div
                        key={a.id}
                        className={`rounded-lg border px-2 py-1.5 ${
                          a.en_chevauchement
                            ? "border-error bg-error-container/30"
                            : "border-outline-soft bg-surface-container-low"
                        }`}
                      >
                        <p className="flex items-center gap-1 text-label-md text-on-surface-variant">
                          {a.en_chevauchement && (
                            <WarningAmberOutlined style={{ fontSize: 13 }} className="text-error" />
                          )}
                          {heureCourte(a.debut)}–{heureCourte(a.fin)}
                          <span className="text-outline-variant">· {a.heures} h</span>
                        </p>
                        <p className="truncate text-body-sm font-medium text-on-surface">
                          {a.ressource}
                        </p>
                        {a.site && (
                          <p className="flex items-center gap-1 truncate text-label-md text-on-surface-variant">
                            {a.site_couleur && (
                              <span
                                className="h-2 w-2 flex-none rounded-full"
                                style={{ backgroundColor: a.site_couleur }}
                              />
                            )}
                            {a.site}
                          </p>
                        )}
                        {a.objet && (
                          <p className="truncate text-label-md text-outline">{a.objet}</p>
                        )}
                        {a.motif_forcage && (
                          <p className="mt-0.5 text-label-sm text-error" title={a.motif_forcage}>
                            Forcé : {a.motif_forcage}
                          </p>
                        )}
                        {peutAffecter && (
                          <button
                            type="button"
                            onClick={() => setASupprimer(a)}
                            aria-label="Retirer l'affectation"
                            className="mt-1 inline-flex items-center gap-1 text-label-md text-on-surface-variant transition-colors hover:text-error"
                          >
                            <DeleteOutlineOutlined style={{ fontSize: 14 }} />
                            Retirer
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {ajout && planning && (
        <FormulaireAffectation
          planning={planning}
          jour={ajout.jour}
          enCours={enCours}
          onClose={() => setAjout(null)}
          onSubmit={poser}
          onLot={async (corps) => {
            setEnCours(true);
            try {
              const lot = await operationsApi.affecterGroupe({ ...corps, planning_id: planningId });
              setAjout(null);
              setToast(
                `${lot.posees.length} affectation(s) créée(s)` +
                  (lot.refusees.length ? `, ${lot.refusees.length} refusée(s) pour conflit.` : "."),
              );
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Affectation impossible.");
            } finally {
              setEnCours(false);
            }
          }}
        />
      )}

      {conflit && (
        <ConflitDialog
          conflit={conflit.conflit}
          enCours={enCours}
          onAnnuler={() => setConflit(null)}
          onForcer={(motif) => conflit.reessayer(motif)}
        />
      )}

      {aSupprimer && (
        <ConfirmDialog
          title="Retirer cette affectation ?"
          message={`${aSupprimer.ressource} — ${heureCourte(aSupprimer.debut)}–${heureCourte(aSupprimer.fin)}. Les marques de chevauchement associées disparaissent avec elle.`}
          confirmLabel="Retirer"
          onCancel={() => setASupprimer(null)}
          onConfirm={async () => {
            try {
              await operationsApi.supprimerAffectation(aSupprimer.id);
              setToast("Affectation retirée.");
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Suppression impossible.");
            } finally {
              setASupprimer(null);
            }
          }}
        />
      )}

      {duplication && (
        <DialogueDuplication
          semaine={semaine}
          onClose={() => setDuplication(false)}
          onDone={async (decalage) => {
            setEnCours(true);
            try {
              const r = await operationsApi.dupliquer({
                planning_id: planningId,
                source_debut: isoJour(semaine),
                source_fin: isoJour(new Date(semaine.getTime() + 6 * 86_400_000)),
                decalage_jours: decalage,
              });
              setDuplication(false);
              setToast(
                `${r.posees.length} affectation(s) dupliquée(s)` +
                  (r.refusees.length ? `, ${r.refusees.length} refusée(s).` : "."),
              );
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Duplication impossible.");
            } finally {
              setEnCours(false);
            }
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}

function DialogueDuplication({
  semaine,
  onClose,
  onDone,
}: {
  semaine: Date;
  onClose: () => void;
  onDone: (decalageJours: number) => void;
}) {
  const [semaines, setSemaines] = useState(1);
  const cible = new Date(semaine.getTime() + semaines * 7 * 86_400_000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[28rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">Dupliquer la semaine</h2>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="text-body-sm text-on-surface-variant">
            Recopie les affectations de la semaine du{" "}
            {semaine.toLocaleDateString("fr-FR")} vers celle du{" "}
            <span className="font-medium text-on-surface">
              {cible.toLocaleDateString("fr-FR")}
            </span>
            .
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Décalage (semaines)</span>
            <input
              type="number"
              min={1}
              max={52}
              value={semaines}
              onChange={(e) => setSemaines(Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </label>
          <p className="text-label-md text-on-surface-variant">
            Les copies qui tomberaient hors de la période du planning, ou sur une ressource
            déjà prise, sont refusées et vous seront rapportées — rien n&apos;est omis en
            silence.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onDone(semaines * 7)}
            className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors"
          >
            Dupliquer
          </button>
        </div>
      </div>
    </div>
  );
}
