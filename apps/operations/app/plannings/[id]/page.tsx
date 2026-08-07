"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  ArrowBackOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  ContentCopyOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import { ConflitDialog } from "@/components/ConflitDialog";
import { DrawerAffectation } from "@/components/DrawerAffectation";
import { FormulaireAffectation } from "@/components/FormulaireAffectation";
import { VueJour } from "@/components/VueJour";
import { VueMois } from "@/components/VueMois";
import { VueSemaine } from "@/components/VueSemaine";
import {
  ConflitError,
  TEINTES_TYPE,
  isoJour,
  lundiDe,
  operationsApi,
  type Affectation,
  type Conflit,
  type Lot,
  type Planning,
  type Site,
} from "@/lib/operations-api";

type Echelle = "jour" | "semaine" | "mois";

export default function PlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const planningId = Number(id);
  const { can } = usePermissions();
  const peutAffecter = can("operations.affectations.manage");

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [affectations, setAffectations] = useState<Affectation[] | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  const [echelle, setEchelle] = useState<Echelle>("semaine");
  const [ancre, setAncre] = useState(() => new Date());

  const [ajout, setAjout] = useState<{ jour: Date; heure?: number } | null>(null);
  const [ouverte, setOuverte] = useState<Affectation | null>(null);
  const [conflit, setConflit] = useState<{ conflit: Conflit; reessayer: (m: string) => void } | null>(null);
  const [aSupprimer, setASupprimer] = useState<Affectation | null>(null);
  const [aDefaire, setADefaire] = useState<string | null>(null);
  const [duplication, setDuplication] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  /** La fenêtre observée. Les jours affichés en découlent — c'est la seule
   *  chose qui change entre les trois échelles. */
  const fenetre = useMemo(() => {
    if (echelle === "jour") {
      const debut = new Date(ancre);
      debut.setHours(0, 0, 0, 0);
      return { debut, fin: new Date(debut.getTime() + 86_400_000), jours: [debut] };
    }
    if (echelle === "mois") {
      const debut = new Date(ancre.getFullYear(), ancre.getMonth(), 1);
      const fin = new Date(ancre.getFullYear(), ancre.getMonth() + 1, 1);
      // La grille du mois déborde sur les semaines voisines : on charge large,
      // sinon les cases des bords paraîtraient vides à tort.
      const large = new Date(debut.getTime() - 7 * 86_400_000);
      return { debut: large, fin: new Date(fin.getTime() + 7 * 86_400_000), jours: [] };
    }
    const debut = lundiDe(ancre);
    return {
      debut,
      fin: new Date(debut.getTime() + 7 * 86_400_000),
      jours: Array.from({ length: 7 }, (_, i) => new Date(debut.getTime() + i * 86_400_000)),
    };
  }, [echelle, ancre]);

  const charger = useCallback(async () => {
    try {
      const [plannings, lignes, listeSites] = await Promise.all([
        operationsApi.plannings(),
        operationsApi.affectations({
          planning_id: planningId,
          depuis: fenetre.debut.toISOString(),
          jusqu_a: fenetre.fin.toISOString(),
        }),
        operationsApi.sites(true),
      ]);
      const trouve = plannings.find((p) => p.id === planningId) ?? null;
      setPlanning(trouve);
      // Un planning d'un AUTRE workspace n'est pas listé ici : sans ce message,
      // la page afficherait un calendrier vide et laisserait croire qu'il n'y a
      // rien de planifié, alors qu'on n'a simplement pas le droit de le voir.
      setErreur(trouve ? null : "Ce planning n'existe pas dans ce workspace.");
      setAffectations(lignes);
      setSites(listeSites);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger le planning.");
      setAffectations([]);
    }
  }, [planningId, fenetre.debut, fenetre.fin]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function poser(corps: Record<string, unknown>) {
    setEnCours(true);
    try {
      const r = await operationsApi.creerAffectation({ ...corps, planning_id: planningId });
      setAjout(null);
      setConflit(null);
      const lot = "posees" in r ? (r as Lot) : null;
      setToast(
        lot
          ? `${lot.posees.length} créneau(x) posé(s)` +
            (lot.refusees.length ? `, ${lot.refusees.length} refusé(s) pour conflit.` : ".")
          : "Affectation créée.",
      );
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

  async function enregistrer(corps: Record<string, unknown>) {
    if (!ouverte) return;
    setEnCours(true);
    try {
      await operationsApi.modifierAffectation(ouverte.id, corps);
      setOuverte(null);
      setConflit(null);
      setToast("Affectation modifiée.");
      await charger();
    } catch (e) {
      if (e instanceof ConflitError) {
        const cible = ouverte;
        setOuverte(null);
        setConflit({
          conflit: e.conflit,
          reessayer: async (motif) => {
            await operationsApi.modifierAffectation(cible.id, { ...corps, motif_forcage: motif });
            setConflit(null);
            setToast("Affectation déplacée malgré le conflit.");
            await charger();
          },
        });
      } else {
        setErreur(e instanceof Error ? e.message : "Modification impossible.");
      }
    } finally {
      setEnCours(false);
    }
  }

  const decaler = (pas: number) => {
    const d = new Date(ancre);
    if (echelle === "jour") d.setDate(d.getDate() + pas);
    else if (echelle === "mois") d.setMonth(d.getMonth() + pas);
    else d.setDate(d.getDate() + pas * 7);
    setAncre(d);
  };

  const titrePeriode =
    echelle === "jour"
      ? ancre.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })
      : echelle === "mois"
        ? ancre.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
        : `Semaine du ${lundiDe(ancre).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1280px] p-4 md:p-8">
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
                <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: TEINTES_TYPE[planning.type] }} />
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
                onClick={() => setAjout({ jour: echelle === "semaine" ? lundiDe(ancre) : ancre })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Affecter
              </button>
            </div>
          )}
        </div>

        {/* Échelle + navigation */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-outline-soft p-0.5">
            {(["jour", "semaine", "mois"] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEchelle(e)}
                className={`h-8 rounded-md px-3 text-body-sm capitalize transition-colors ${
                  echelle === e ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Période précédente"
            onClick={() => decaler(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
          >
            <ChevronLeftOutlined style={{ fontSize: 18 }} />
          </button>
          <p className="text-body-md capitalize text-on-surface">{titrePeriode}</p>
          <button
            type="button"
            aria-label="Période suivante"
            onClick={() => decaler(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
          >
            <ChevronRightOutlined style={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            onClick={() => setAncre(new Date())}
            className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            Aujourd&apos;hui
          </button>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>
        )}

        <div className="mt-4">
          {affectations === null ? (
            <p className="text-body-sm text-on-surface-variant">Chargement…</p>
          ) : echelle === "mois" ? (
            <VueMois
              mois={ancre}
              affectations={affectations}
              onJour={(j) => {
                setAncre(j);
                setEchelle("jour");
              }}
            />
          ) : echelle === "jour" ? (
            <VueJour
              jour={fenetre.jours[0]}
              affectations={affectations}
              onCase={peutAffecter ? (jour, heure) => setAjout({ jour, heure }) : undefined}
              onAffectation={setOuverte}
            />
          ) : (
            <VueSemaine
              jours={fenetre.jours}
              affectations={affectations}
              onJourVide={peutAffecter ? (jour) => setAjout({ jour }) : undefined}
              onAffectation={setOuverte}
            />
          )}
        </div>
      </div>

      {ajout && planning && (
        <FormulaireAffectation
          planning={planning}
          jour={ajout.jour}
          heure={ajout.heure}
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

      {ouverte && (
        <DrawerAffectation
          affectation={ouverte}
          sites={sites}
          peutModifier={peutAffecter}
          enCours={enCours}
          onClose={() => setOuverte(null)}
          onEnregistrer={enregistrer}
          onSupprimer={() => {
            setASupprimer(ouverte);
            setOuverte(null);
          }}
          onDefaireLot={(lotId) => {
            setADefaire(lotId);
            setOuverte(null);
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
          message={`${aSupprimer.ressource} — les marques de chevauchement associées disparaissent avec elle.`}
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

      {aDefaire && (
        <ConfirmDialog
          title="Défaire tout le lot ?"
          message="Tous les créneaux posés en même temps que celui-ci seront retirés — y compris les occurrences répétées des autres semaines."
          confirmLabel="Défaire"
          onCancel={() => setADefaire(null)}
          onConfirm={async () => {
            try {
              const r = await operationsApi.defaireLot(aDefaire);
              setToast(`${r.retirees} créneau(x) retiré(s).`);
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Opération impossible.");
            } finally {
              setADefaire(null);
            }
          }}
        />
      )}

      {duplication && (
        <DialogueDuplication
          semaine={lundiDe(ancre)}
          onClose={() => setDuplication(false)}
          onDone={async (decalage) => {
            setEnCours(true);
            try {
              const semaine = lundiDe(ancre);
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
            Recopie les affectations de la semaine du {semaine.toLocaleDateString("fr-FR")} vers
            celle du{" "}
            <span className="font-medium text-on-surface">{cible.toLocaleDateString("fr-FR")}</span>.
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
            Les copies hors période, ou sur une ressource déjà prise, sont refusées et vous
            seront rapportées — rien n&apos;est omis en silence.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low">
            Annuler
          </button>
          <button type="button" onClick={() => onDone(semaines * 7)} className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button">
            Dupliquer
          </button>
        </div>
      </div>
    </div>
  );
}
