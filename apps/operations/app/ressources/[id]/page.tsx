"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { CarteUtilisation, Kpi } from "@/components/Mesures";
import { heureCourte, operationsApi, type ActiviteRessource } from "@/lib/operations-api";

/** Fenêtres proposées. Une fenêtre d'un jour donnerait une « moyenne
 *  hebdomadaire » de huit heures multipliées par sept — juste arithmétiquement,
 *  absurde comme jugement. On ne descend donc pas sous la semaine. */
const FENETRES = [
  { cle: "7", libelle: "7 jours", jours: 7 },
  { cle: "28", libelle: "4 semaines", jours: 28 },
  { cle: "90", libelle: "3 mois", jours: 90 },
] as const;

export default function RessourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ressourceId = Number(id);

  const [jours, setJours] = useState<number>(28);
  const [activite, setActivite] = useState<ActiviteRessource | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setActivite(null);
    try {
      const fin = new Date();
      fin.setHours(0, 0, 0, 0);
      fin.setDate(fin.getDate() + 1);
      const debut = new Date(fin.getTime() - jours * 86_400_000);
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
  }, [ressourceId, jours]);

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
          <div className="flex rounded-lg border border-outline-soft p-0.5">
            {FENETRES.map((f) => (
              <button
                key={f.cle}
                type="button"
                onClick={() => setJours(f.jours)}
                className={`h-8 rounded-md px-3 text-body-sm transition-colors ${
                  jours === f.jours
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {f.libelle}
              </button>
            ))}
          </div>
        </div>

        {!activite ? (
          !erreur && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi libelle="Heures sur la période" valeur={activite.totaux.heures} unite="h" />
              <Kpi libelle="Créneaux" valeur={activite.totaux.creneaux} />
              <Kpi libelle="Plannings" valeur={activite.totaux.plannings} />
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
              entamées.
            </p>

            <section className="mt-8">
              <h2 className="text-headline-sm text-on-surface">Affectations</h2>
              {activite.affectations.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
                  Aucune affectation sur cette période.
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
                            {a.objet ?? "—"}
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
