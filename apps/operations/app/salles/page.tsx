"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AddOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  MeetingRoomOutlined,
  PendingActionsOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import { SelecteurVue, type VueDef } from "@/components/SelecteurVue";
import { ConflitDialog } from "@/components/ConflitDialog";
import { FormulaireReservation } from "@/components/FormulaireReservation";
import { DecisionDialog } from "@/components/DecisionDialog";
import {
  ConflitError,
  heureCourte,
  lundiDe,
  operationsApi,
  type Conflit,
  type Reservation,
  type Salle,
} from "@/lib/operations-api";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const s = { fontSize: 18 };

const VUES: VueDef[] = [
  {
    cle: "calendrier",
    libelle: "Calendrier",
    description: "Qui occupe quelle salle, et quand",
    icone: <MeetingRoomOutlined style={s} />,
  },
  {
    cle: "demandes",
    libelle: "Demandes",
    description: "Les réservations à accepter ou refuser",
    icone: <PendingActionsOutlined style={s} />,
  },
];

const TEINTE_STATUT: Record<string, string> = {
  DEMANDEE: "border-outline-variant bg-surface-container-low",
  ACCEPTEE: "border-secondary/40 bg-secondary/10",
  REFUSEE: "border-outline-soft bg-surface-container opacity-60",
};

function Contenu() {
  const router = useRouter();
  const params = useSearchParams();
  const vue = params.get("vue") ?? "calendrier";

  const { can } = usePermissions();
  const moi = useSessionStore((s) => s.user?.id);
  const peutValider = can("operations.reservations.valider");
  const peutDemander = can("operations.reservations.demander") || peutValider;

  const [salles, setSalles] = useState<Salle[]>([]);
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [semaine, setSemaine] = useState(() => lundiDe(new Date()));
  const [creation, setCreation] = useState<{ salle?: Salle; jour: Date } | null>(null);
  const [decision, setDecision] = useState<{ r: Reservation; action: "accepter" | "refuser" } | null>(null);
  const [conflit, setConflit] = useState<{ conflit: Conflit; reessayer: (m: string) => void } | null>(null);
  const [aRetirer, setARetirer] = useState<Reservation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const fin = useMemo(() => new Date(semaine.getTime() + 7 * 86_400_000), [semaine]);

  const charger = useCallback(async () => {
    try {
      const [liste, lignes] = await Promise.all([
        operationsApi.salles(),
        vue === "demandes"
          ? operationsApi.reservations({ statut: "DEMANDEE" })
          : operationsApi.reservations({
              depuis: semaine.toISOString(),
              jusqu_a: fin.toISOString(),
            }),
      ]);
      setSalles(liste);
      setReservations(lignes);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les salles.");
      setReservations([]);
    }
  }, [vue, semaine, fin]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function reserver(corps: Record<string, unknown>) {
    setEnCours(true);
    try {
      const r = await operationsApi.reserver(corps);
      setCreation(null);
      setConflit(null);
      setToast(
        r.statut === "ACCEPTEE"
          ? "Salle réservée."
          : "Demande envoyée — elle attend une validation.",
      );
      await charger();
    } catch (e) {
      if (e instanceof ConflitError) {
        setConflit({
          conflit: e.conflit,
          reessayer: (motif) => void reserver({ ...corps, motif_forcage: motif }),
        });
      } else {
        setErreur(e instanceof Error ? e.message : "Réservation impossible.");
      }
    } finally {
      setEnCours(false);
    }
  }

  const enAttente = (reservations ?? []).filter((r) => r.statut === "DEMANDEE");

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-8">
        <SelecteurVue
          vues={VUES}
          courante={vue}
          onChange={(c) => router.replace(c === "calendrier" ? "/salles" : `/salles?vue=${c}`, { scroll: false })}
        />
        {peutDemander && vue === "calendrier" && (
          <button
            type="button"
            onClick={() => setCreation({ jour: semaine })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            {peutValider ? "Réserver" : "Demander une salle"}
          </button>
        )}
      </div>

      <div className="p-4 md:p-8">
        {erreur && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {vue === "demandes" ? (
          <Demandes
            reservations={enAttente}
            peutValider={peutValider}
            moi={moi}
            onDecider={(r, action) => setDecision({ r, action })}
            onRetirer={setARetirer}
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Semaine précédente"
                onClick={() => setSemaine(new Date(semaine.getTime() - 7 * 86_400_000))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
              >
                <ChevronLeftOutlined style={{ fontSize: 18 }} />
              </button>
              <p className="text-body-md text-on-surface">
                Semaine du {semaine.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
              </p>
              <button
                type="button"
                aria-label="Semaine suivante"
                onClick={() => setSemaine(new Date(semaine.getTime() + 7 * 86_400_000))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
              >
                <ChevronRightOutlined style={{ fontSize: 18 }} />
              </button>
              <button
                type="button"
                onClick={() => setSemaine(lundiDe(new Date()))}
                className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant hover:bg-surface-container-low"
              >
                Cette semaine
              </button>
              {enAttente.length > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-label-md text-on-surface-variant">
                  <PendingActionsOutlined style={{ fontSize: 14 }} />
                  {enAttente.length} demande{enAttente.length > 1 ? "s" : ""} en attente
                </span>
              )}
            </div>

            {reservations === null ? (
              <p className="text-body-sm text-on-surface-variant">Chargement…</p>
            ) : salles.length === 0 ? (
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
                <MeetingRoomOutlined style={{ fontSize: 28 }} className="text-outline" />
                <p className="mt-2 text-body-md text-on-surface">Aucune salle.</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Les salles sont des ressources de type Espace — créez-les depuis
                  Plannings › Ressources.
                </p>
              </div>
            ) : (
              <CalendrierSalles
                salles={salles}
                reservations={reservations}
                semaine={semaine}
                peutDemander={peutDemander}
                onReserver={(salle, jour) => setCreation({ salle, jour })}
              />
            )}
          </>
        )}
      </div>

      {creation && (
        <FormulaireReservation
          salles={salles.filter((s) => s.active)}
          salleChoisie={creation.salle}
          jour={creation.jour}
          peutValider={peutValider}
          enCours={enCours}
          onClose={() => setCreation(null)}
          onSubmit={reserver}
        />
      )}

      {decision && (
        <DecisionDialog
          reservation={decision.r}
          action={decision.action}
          enCours={enCours}
          onClose={() => setDecision(null)}
          onConfirm={async (motif) => {
            setEnCours(true);
            try {
              if (decision.action === "accepter") await operationsApi.accepter(decision.r.id, motif);
              else await operationsApi.refuser(decision.r.id, motif);
              setDecision(null);
              setToast(decision.action === "accepter" ? "Réservation acceptée." : "Réservation refusée.");
              await charger();
            } catch (e) {
              if (e instanceof ConflitError) {
                setDecision(null);
                setConflit({
                  conflit: e.conflit,
                  reessayer: async (m) => {
                    await operationsApi.accepter(decision.r.id, m);
                    setConflit(null);
                    setToast("Réservation acceptée malgré le conflit.");
                    await charger();
                  },
                });
              } else {
                setErreur(e instanceof Error ? e.message : "Décision impossible.");
              }
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

      {aRetirer && (
        <ConfirmDialog
          title="Retirer cette réservation ?"
          message={`${aRetirer.salle} — ${heureCourte(aRetirer.debut)}–${heureCourte(aRetirer.fin)}. La salle redevient libre sur ce créneau.`}
          confirmLabel="Retirer"
          onCancel={() => setARetirer(null)}
          onConfirm={async () => {
            try {
              await operationsApi.annulerReservation(aRetirer.id);
              setToast("Réservation retirée.");
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Retrait impossible.");
            } finally {
              setARetirer(null);
            }
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

/** Une ligne par salle, sept colonnes. C'est la lecture qu'on attend d'un
 *  planning de salles : « l'auditoire est-il libre jeudi ? » se répond d'un
 *  coup d'œil, alors qu'une liste chronologique obligerait à parcourir. */
function CalendrierSalles({
  salles,
  reservations,
  semaine,
  peutDemander,
  onReserver,
}: {
  salles: Salle[];
  reservations: Reservation[];
  semaine: Date;
  peutDemander: boolean;
  onReserver: (salle: Salle, jour: Date) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[160px_repeat(7,1fr)] gap-1.5">
          <div />
          {JOURS.map((nom, i) => {
            const jour = new Date(semaine.getTime() + i * 86_400_000);
            return (
              <p key={nom} className="px-1 pb-1 text-label-md text-on-surface-variant">
                {nom.slice(0, 3)} {jour.getDate()}
              </p>
            );
          })}

          {salles.map((salle) => (
            <FragmentSalle
              key={salle.id}
              salle={salle}
              semaine={semaine}
              reservations={reservations.filter((r) => r.salle_id === salle.id)}
              peutDemander={peutDemander}
              onReserver={onReserver}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FragmentSalle({
  salle,
  semaine,
  reservations,
  peutDemander,
  onReserver,
}: {
  salle: Salle;
  semaine: Date;
  reservations: Reservation[];
  peutDemander: boolean;
  onReserver: (salle: Salle, jour: Date) => void;
}) {
  return (
    <>
      <div className={`py-2 pr-2 ${salle.active ? "" : "opacity-50"}`}>
        <p className="text-body-sm font-medium text-on-surface">{salle.libelle}</p>
        <p className="text-label-md text-on-surface-variant">
          {salle.capacite ? `${salle.capacite} places` : "—"}
          {!salle.active && " · hors service"}
        </p>
      </div>
      {Array.from({ length: 7 }, (_, i) => {
        const jour = new Date(semaine.getTime() + i * 86_400_000);
        const duJour = reservations.filter(
          (r) => new Date(r.debut).toDateString() === jour.toDateString(),
        );
        return (
          <div key={i} className="min-h-[64px] rounded-lg border border-outline-soft p-1">
            {duJour.length === 0 ? (
              <button
                type="button"
                disabled={!peutDemander || !salle.active}
                onClick={() => onReserver(salle, jour)}
                className="h-full w-full rounded text-label-md text-outline transition-colors hover:bg-surface-container-low disabled:cursor-default disabled:hover:bg-transparent"
              >
                {peutDemander && salle.active ? "+" : ""}
              </button>
            ) : (
              <div className="flex flex-col gap-1">
                {duJour.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded border px-1.5 py-1 ${TEINTE_STATUT[r.statut] ?? ""}`}
                    title={r.objet ?? undefined}
                  >
                    <p className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                      {r.en_chevauchement && (
                        <WarningAmberOutlined style={{ fontSize: 12 }} className="text-error" />
                      )}
                      {heureCourte(r.debut)}–{heureCourte(r.fin)}
                    </p>
                    <p className="truncate text-label-md text-on-surface">
                      {r.objet ?? r.demandeur ?? "Réservation"}
                    </p>
                    {r.statut === "DEMANDEE" && (
                      <p className="text-label-sm text-on-surface-variant">en attente</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function Demandes({
  reservations,
  peutValider,
  moi,
  onDecider,
  onRetirer,
}: {
  reservations: Reservation[];
  peutValider: boolean;
  moi: number | undefined;
  onDecider: (r: Reservation, action: "accepter" | "refuser") => void;
  onRetirer: (r: Reservation) => void;
}) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
        <p className="text-body-md text-on-surface">Aucune demande en attente.</p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Une demande n&apos;occupe pas la salle tant qu&apos;elle n&apos;est pas acceptée —
          plusieurs personnes peuvent donc demander le même créneau.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {reservations.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-body-md font-medium text-on-surface">
                {r.salle}
                {r.capacite ? (
                  <span className="ml-2 text-label-md text-on-surface-variant">
                    {r.capacite} places
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                {new Date(r.debut).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}{" "}
                · {heureCourte(r.debut)}–{heureCourte(r.fin)} · {r.heures} h
              </p>
              <p className="mt-1 text-body-sm text-on-surface">
                {r.objet ?? "Sans objet précisé"}
                <span className="ml-2 text-label-md text-outline">
                  demandé par {r.demandeur ?? "—"}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              {peutValider ? (
                <>
                  <button
                    type="button"
                    onClick={() => onDecider(r, "refuser")}
                    className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:text-error"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecider(r, "accepter")}
                    className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button"
                  >
                    Accepter
                  </button>
                </>
              ) : r.demandeur_user_id === moi ? (
                <button
                  type="button"
                  onClick={() => onRetirer(r)}
                  className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:text-error"
                >
                  Retirer ma demande
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function SallesPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<div className="p-8 text-body-sm text-on-surface-variant">Chargement…</div>}>
        <Contenu />
      </Suspense>
    </DashboardShell>
  );
}
