"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, WarningAmberOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreProportion, Kpi } from "@/components/Mesures";
import {
  TEINTES_TYPE,
  operationsApi,
  type RapportPlanning,
} from "@/lib/operations-api";

export default function RapportPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const planningId = Number(id);

  const [rapport, setRapport] = useState<RapportPlanning | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setRapport(await operationsApi.rapportPlanning(planningId));
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Rapport indisponible.");
      }
    })();
  }, [planningId]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1100px] p-4 md:p-8">
        <Link
          href={`/plannings/${planningId}`}
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Retour au planning
        </Link>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {!rapport ? (
          !erreur && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <>
            <h1 className="mt-2 flex items-center gap-2 font-display text-headline-md text-on-surface">
              <span
                className="h-6 w-1.5 rounded-full"
                style={{ backgroundColor: TEINTES_TYPE[rapport.planning.type] }}
              />
              {rapport.planning.nom}
            </h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Rapport sur la période d&apos;application — du{" "}
              {new Date(rapport.planning.debut).toLocaleDateString("fr-FR")} au{" "}
              {new Date(rapport.planning.fin).toLocaleDateString("fr-FR")} ({rapport.planning.jours} jours)
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi libelle="Ressources affectées" valeur={rapport.totaux.ressources} />
              <Kpi libelle="Heures de prestation" valeur={rapport.totaux.heures} unite="h" />
              <Kpi libelle="Créneaux" valeur={rapport.totaux.creneaux} />
              <Kpi
                libelle="Heures / semaine"
                valeur={rapport.totaux.heures_par_semaine}
                unite="h"
                note="Rythme moyen sur la période du planning"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi libelle="Sites couverts" valeur={rapport.totaux.sites} />
              <Kpi
                libelle="Heures sans site"
                valeur={rapport.totaux.heures_sans_site}
                unite="h"
                note="Créneaux sans lieu déclaré"
              />
              <Kpi
                libelle="Heures / ressource"
                valeur={rapport.totaux.heures_par_ressource}
                unite="h"
              />
              <Kpi
                libelle="Chevauchements assumés"
                valeur={rapport.totaux.chevauchements}
                alerte={rapport.totaux.chevauchements > 0}
                note="Créneaux posés malgré un conflit, avec justification"
              />
            </div>

            <Section titre="Par ressource" vide={rapport.par_ressource.length === 0}>
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-soft bg-surface-row-alt">
                    <Th>Ressource</Th>
                    <Th align="right">Créneaux</Th>
                    <Th align="right">Heures</Th>
                    <Th align="right">Sites</Th>
                    <Th>Part de la charge</Th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.par_ressource.map((l) => (
                    <tr key={l.ressource_id} className="border-b border-hairline last:border-b-0">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/ressources/${l.ressource_id}`}
                          className="text-body-sm font-medium text-on-surface hover:underline"
                        >
                          {l.ressource}
                        </Link>
                      </td>
                      <Td>{l.creneaux}</Td>
                      <Td>{l.heures}</Td>
                      <Td>{l.sites}</Td>
                      <td className="w-[34%] px-4 py-2.5">
                        <BarreProportion pourcentage={l.part} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section titre="Par site" vide={rapport.par_site.length === 0}>
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-soft bg-surface-row-alt">
                    <Th>Site</Th>
                    <Th>Ville</Th>
                    <Th align="right">Créneaux</Th>
                    <Th align="right">Heures</Th>
                    <Th align="right">Ressources</Th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.par_site.map((l) => (
                    <tr key={l.site_id} className="border-b border-hairline last:border-b-0">
                      <td className="px-4 py-2.5 text-body-sm font-medium text-on-surface">{l.site}</td>
                      <td className="px-4 py-2.5 text-body-sm text-on-surface-variant">{l.ville ?? "—"}</td>
                      <Td>{l.creneaux}</Td>
                      <Td>{l.heures}</Td>
                      <Td>{l.ressources}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {rapport.totaux.chevauchements > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-error-container/30 px-3 py-2 text-body-sm text-on-surface-variant">
                <WarningAmberOutlined style={{ fontSize: 16 }} className="mt-px flex-none text-error" />
                <span>
                  {rapport.totaux.chevauchements} créneau(x) ont été posés malgré un conflit.
                  Ce n&apos;est pas une anomalie à corriger — chacun porte la justification de
                  celui qui a tranché, visible dans le détail du créneau.
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Section({
  titre, vide, children,
}: {
  titre: string;
  vide: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-headline-sm text-on-surface">{titre}</h2>
      {vide ? (
        <p className="mt-2 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-center text-body-sm text-on-surface-variant">
          Rien à montrer sur cette période.
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
          {children}
        </div>
      )}
    </section>
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

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface-variant">
      {children}
    </td>
  );
}
