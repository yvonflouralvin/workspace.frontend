"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowBackOutlined,
  UpcomingOutlined,
  HistoryOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { CarteUtilisation, Kpi } from "@/components/Mesures";
import { heureCourte, operationsApi, type ActiviteRessource } from "@/lib/operations-api";

/** Fenêtres proposées, et leur SENS.
 *
 *  Un planning se lit vers l'avant : regarder en arrière par défaut cachait
 *  tout ce qui est réservé, c'est-à-dire l'essentiel de ce qu'on vient voir.
 *  Le passé reste accessible, il se demande — et le libellé dit lequel des
 *  deux on regarde, « 4 semaines » seul ne le disait pas.
 *
 *  On ne descend pas sous la semaine : un seul jour donnerait une « moyenne
 *  hebdomadaire » de huit heures multipliées par sept. */
const DUREES = [7, 30, 90] as const;

export default function RessourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ressourceId = Number(id);

  // Deux réglages distincts, parce que ce sont deux questions distinctes :
  // « dans quel sens je regarde » et « sur quelle profondeur ». Les mêler en
  // une seule rangée de boutons rendait « 90 derniers jours » inatteignable.
  const [passe, setPasse] = useState(false);
  const [jours, setJours] = useState<number>(30);
  const [activite, setActivite] = useState<ActiviteRessource | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setActivite(null);
    try {
      const minuit = new Date();
      minuit.setHours(0, 0, 0, 0);
      const debut = passe ? new Date(minuit.getTime() - jours * 86_400_000) : minuit;
      const fin = new Date(debut.getTime() + jours * 86_400_000);
      setActivite(
        await operationsApi.activiteRessource(ressourceId, {
          depuis: debut.toISOString(),
          jusqu_a: fin.toISOString(),
        }),
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Activité indisponible.");
    }
  }, [ressourceId, passe, jours]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1100px] p-4 md:p-8">
        <Link
          href="/plannings?vue=ressources"
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Ressources
        </Link>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">
              {activite?.ressource.nom ?? "…"}
            </h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {[activite?.ressource.categorie, activite?.ressource.type]
                .filter(Boolean)
                .join(" · ")}
              {activite && !activite.ressource.active && " · inactive"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-outline-soft p-0.5">
              {([
                [false, "À venir"],
                [true, "Passé"],
              ] as const).map(([valeur, libelle]) => (
                <button
                  key={libelle}
                  type="button"
                  onClick={() => setPasse(valeur)}
                  className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-body-sm transition-colors ${
                    passe === valeur
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {valeur ? (
                    <HistoryOutlined style={{ fontSize: 15 }} />
                  ) : (
                    <UpcomingOutlined style={{ fontSize: 15 }} />
                  )}
                  {libelle}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-outline-soft p-0.5">
              {DUREES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setJours(d)}
                  className={`h-8 rounded-md px-3 text-body-sm transition-colors ${
                    jours === d
                      ? "bg-surface-container text-on-surface"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {d} j
                </button>
              ))}
            </div>
          </div>
        </div>

        {!activite ? (
          !erreur && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi libelle="Heures sur la période" valeur={activite.totaux.heures} unite="h" />
              <Kpi libelle="Créneaux" valeur={activite.totaux.creneaux} />
              <Kpi
                libelle="Demandes en attente"
                valeur={activite.totaux.en_attente}
                alerte={activite.totaux.en_attente > 0}
                note="Elles n'occupent pas encore le créneau"
              />
              <Kpi libelle="Sites" valeur={activite.totaux.sites} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <CarteUtilisation
                titre="Rythme hebdomadaire"
                realise={activite.moyennes.hebdomadaire}
                verdict={activite.utilisation.hebdomadaire}
              />
              <CarteUtilisation
                titre="Rythme mensuel"
                realise={activite.moyennes.mensuelle}
                verdict={activite.utilisation.mensuelle}
              />
            </div>

            <p className="mt-2 text-label-md text-outline">
              Moyennes ramenées à la durée réelle de la fenêtre ({activite.fenetre.semaines}{" "}
              semaine{activite.fenetre.semaines > 1 ? "s" : ""}), pas au nombre de semaines
              entamées. Les demandes en attente n&apos;y entrent pas : elles n&apos;occupent
              rien tant que personne n&apos;a tranché.
            </p>

            <section className="mt-8">
              <h2 className="text-headline-sm text-on-surface">
                {passe ? "Affectations passées" : "Affectations à venir"}
                <span className="ml-2 text-body-sm font-normal text-on-surface-variant">
                  {new Date(activite.fenetre.depuis).toLocaleDateString("fr-FR")} →{" "}
                  {new Date(activite.fenetre.jusqu_a).toLocaleDateString("fr-FR")}
                </span>
              </h2>
              {activite.affectations.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
                  {passe
                    ? "Aucune affectation sur cette période."
                    : "Rien de prévu sur cette période."}
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
                  <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-soft bg-surface-row-alt">
                        <Th>Jour</Th>
                        <Th>Créneau</Th>
                        <Th align="right">Heures</Th>
                        <Th>Site</Th>
                        <Th>Objet</Th>
                        <Th>Statut</Th>
                        <Th>Planning</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {activite.affectations.map((a) => (
                        <tr key={a.id} className="border-b border-hairline last:border-b-0">
                          <td className="whitespace-nowrap px-4 py-2.5 text-body-sm capitalize text-on-surface">
                            {new Date(a.debut).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}
                            {a.en_chevauchement && (
                              <WarningAmberOutlined
                                style={{ fontSize: 13 }}
                                className="ml-1 text-error"
                                titleAccess="Créneau en chevauchement, assumé"
                              />
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-body-sm tabular-nums text-on-surface-variant">
                            {heureCourte(a.debut)}–{heureCourte(a.fin)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface-variant">
                            {a.heures}
                          </td>
                          <td className="px-4 py-2.5 text-body-sm text-on-surface-variant">
                            <span className="inline-flex items-center gap-1.5">
                              {a.site_couleur && (
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: a.site_couleur }}
                                />
                              )}
                              {a.site ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-body-sm text-on-surface-variant">
                            {a.objet ?? a.demandeur ?? "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {a.statut === "DEMANDEE" ? (
                              <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                                En attente
                              </span>
                            ) : (
                              <span className="text-label-sm text-secondary">Confirmé</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-body-sm">
                            {a.planning_id ? (
                              <Link
                                href={`/plannings/${a.planning_id}`}
                                className="text-primary hover:underline"
                              >
                                {a.planning}
                              </Link>
                            ) : (
                              <span className="text-on-surface-variant">Réservation</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {activite.affectations_tronquees > 0 && (
                <p className="mt-2 text-label-md text-on-surface-variant">
                  {activite.affectations_tronquees} affectation(s) de plus ne sont pas
                  listées — resserrez la fenêtre pour les voir.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-4 py-2 text-label-sm uppercase tracking-wide text-outline ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
