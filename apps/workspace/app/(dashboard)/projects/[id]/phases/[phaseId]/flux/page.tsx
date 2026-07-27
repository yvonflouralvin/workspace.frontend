"use client";

import { useEffect, useState } from "react";
import { InfoOutlined } from "@mui/icons-material";
import { BarChart } from "@repo/ui/charts/BarChart";
import { StackedAreaChart } from "@repo/ui/charts/StackedAreaChart";
import {
  CATEGORIE_LABELS,
  projectsApi,
  type Distribution,
  type MesuresDebit,
  type MesuresFlux,
  type MesuresFluxCumule,
} from "@/app/lib/projects-api";
import { usePhase } from "../phase-context";

/** Les mêmes tokens que les pastilles d'état — la couleur vient de la catégorie. */
const BANDES = [
  { cle: "a_faire", libelle: CATEGORIE_LABELS.a_faire!, fill: "fill-status-todo" },
  { cle: "en_cours", libelle: CATEGORIE_LABELS.en_cours!, fill: "fill-status-doing" },
  { cle: "termine", libelle: CATEGORIE_LABELS.termine!, fill: "fill-status-done" },
  { cle: "annule", libelle: CATEGORIE_LABELS.annule!, fill: "fill-status-backlog" },
];

function duree(secondes: number | null): string {
  if (secondes == null) return "—";
  const heures = secondes / 3600;
  if (heures < 1) return `${Math.round(secondes / 60)} min`;
  if (heures < 48) return `${heures.toFixed(1)} h`;
  return `${(heures / 24).toFixed(1)} j`;
}

export default function PhaseFluxPage() {
  const { phase } = usePhase();
  const [flux, setFlux] = useState<MesuresFlux | null>(null);
  const [debit, setDebit] = useState<MesuresDebit | null>(null);
  const [cumule, setCumule] = useState<MesuresFluxCumule | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      projectsApi.mesuresFlux(phase.id),
      projectsApi.mesuresDebit(phase.id, "jour"),
      projectsApi.mesuresFluxCumule(phase.id),
    ])
      .then(([f, d, c]) => {
        setFlux(f);
        setDebit(d);
        setCumule(c);
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : "Mesures indisponibles."));
  }, [phase.id]);

  if (erreur) {
    return <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{erreur}</p>;
  }
  if (!flux || !debit || !cumule) {
    return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div className="max-w-[820px] space-y-5">
      {/* La fiabilité s'affiche AVANT les chiffres : un lecteur doit savoir ce
          qu'ils ne couvrent pas avant de les lire. */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-outline-soft bg-surface-container-low px-4 py-3">
        <InfoOutlined style={{ fontSize: 18 }} className="flex-none mt-0.5 text-outline" />
        <p className="text-body-sm text-on-surface-variant">
          {flux.fiable_depuis ? (
            <>
              Mesures fiables depuis le{" "}
              <strong className="font-semibold text-on-surface">
                {new Date(flux.fiable_depuis).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
              , date des premiers mouvements enregistrés.
            </>
          ) : (
            <>Aucun mouvement enregistré sur cette phase : rien n&apos;est encore mesurable.</>
          )}
          {flux.exclus > 0 && (
            <>
              {" "}
              <strong className="font-semibold text-on-surface">
                {flux.exclus} élément{flux.exclus > 1 ? "s" : ""} exclu{flux.exclus > 1 ? "s" : ""}
              </strong>{" "}
              du lead time et du cycle time : {flux.exclus > 1 ? "leur histoire est" : "son histoire est"}{" "}
              antérieure au journal et la reconstituer donnerait des chiffres faux.
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Carte titre="Lead time" sous="Création → dernière fin" mesure={flux.lead_time} />
        <Carte titre="Cycle time" sous="Début du travail → dernière fin" mesure={flux.cycle_time} />
      </div>

      <Bloc titre="Débit" sous="Éléments terminés par jour — les annulés ne comptent pas">
        {debit.points.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">Aucun élément terminé sur la période.</p>
        ) : (
          <BarChart
            data={debit.points.map((p) => ({
              label: new Date(p.periode).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
              value: p.termines,
            }))}
          />
        )}
      </Bloc>

      <Bloc titre="Flux cumulé" sous="Effectifs par catégorie, jour par jour">
        <StackedAreaChart
          points={cumule.points.map((p) => ({
            label: new Date(String(p.jour)).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
            }),
            valeurs: Object.fromEntries(
              BANDES.map((b) => [b.cle, Number(p[b.cle] ?? 0)])
            ),
          }))}
          series={BANDES}
        />
      </Bloc>
    </div>
  );
}

function Carte({ titre, sous, mesure }: { titre: string; sous: string; mesure: Distribution }) {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <p className="text-body-md font-semibold text-on-surface">{titre}</p>
      <p className="text-label-md text-outline">{sous}</p>
      <div className="flex items-end gap-6 mt-3">
        <span>
          <span className="block text-label-sm uppercase text-outline">Médiane</span>
          <span className="font-display text-headline-md text-on-surface">
            {duree(mesure.mediane_secondes)}
          </span>
        </span>
        <span>
          <span className="block text-label-sm uppercase text-outline">85e centile</span>
          <span className="font-display text-headline-sm text-on-surface-variant">
            {duree(mesure.p85_secondes)}
          </span>
        </span>
      </div>
      <p className="mt-2 text-label-md text-outline">
        {mesure.effectif} élément{mesure.effectif > 1 ? "s" : ""} mesuré
        {mesure.effectif > 1 ? "s" : ""}
        {/* La moyenne est reléguée : sur une distribution asymétrique, elle ne
            décrit aucun cas réel. */}
        {mesure.moyenne_secondes != null && ` · moyenne ${duree(mesure.moyenne_secondes)}`}
      </p>
    </div>
  );
}

function Bloc({ titre, sous, children }: { titre: string; sous: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <p className="text-body-md font-semibold text-on-surface">{titre}</p>
      <p className="text-label-md text-outline mb-3">{sous}</p>
      {children}
    </div>
  );
}
