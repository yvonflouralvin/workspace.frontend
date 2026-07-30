"use client";

import { useEffect, useMemo, useState } from "react";
import { Timeline, type TimelineLigne } from "@repo/ui/Timeline";
import {
  DELIVERABLE_STATUS_LABELS,
  PHASE_STATUS_LABELS,
  PHASE_STATUS_TONES,
  toneFor,
  type Deliverable,
  type Phase,
  type Task,
} from "@/app/lib/projects-api";
import {
  ITERATION_STATUT_LABELS,
  iterationsApi,
  type Iteration,
} from "@/app/lib/iterations-api";
import {
  JALON_STATUT_LABELS,
  JALON_STATUT_TONES,
  echeanceDepassee,
  type Jalon,
} from "@/app/lib/jalons-api";
import { useProject } from "../project-context";

const JOUR = 86_400_000;

/** Sur un axe chronologique, les LIGNES aussi se lisent dans le temps : trier par
 *  position laissait Sprint 3 au-dessus de Sprint 2 parce qu'il avait été créé
 *  après. La date prime, la position ne sert que de repli. */
function parDate<T extends { id: number }>(
  lignes: T[],
  date: (item: T) => string | null | undefined,
  rang: (item: T) => number = () => 0
): T[] {
  return [...lignes].sort((a, b) => {
    const da = date(a);
    const db = date(b);
    if (da && db && da !== db) return da < db ? -1 : 1;
    if (da && !db) return -1;
    if (!da && db) return 1;
    return rang(a) - rang(b) || a.id - b.id;
  });
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Bornes de l'axe : ce que le projet couvre RÉELLEMENT, plus une marge d'une
 *  semaine de chaque côté pour que rien ne colle au bord. */
function bornes(dates: (string | null | undefined)[]): { debut: string; fin: string } | null {
  const valeurs = dates.filter(Boolean).map((d) => new Date(d as string).getTime());
  if (!valeurs.length) return null;
  return {
    debut: new Date(Math.min(...valeurs) - 7 * JOUR).toISOString(),
    fin: new Date(Math.max(...valeurs) + 7 * JOUR).toISOString(),
  };
}

export default function TimelinePage() {
  const { projectId, project, phases, tasks, deliverables, jalons } = useProject();
  const [iterations, setIterations] = useState<Iteration[] | null>(null);

  useEffect(() => {
    iterationsApi
      .listProjet(projectId)
      .then(setIterations)
      .catch(() => setIterations([]));
  }, [projectId]);

  const datees = tasks.filter((t) => t.start_date && t.due_date);
  const nonPlanifiees = tasks.filter((t) => !t.start_date || !t.due_date);

  const axe = useMemo(
    () =>
      bornes([
        project.start_date,
        project.due_date,
        ...phases.flatMap((p) => [p.start_planned, p.end_planned, p.start_real, p.end_real]),
        ...(iterations ?? []).flatMap((i) => [i.date_debut, i.date_fin]),
        ...datees.flatMap((t) => [t.start_date, t.due_date]),
        ...jalons.map((j) => j.date_prevue),
        ...deliverables.map((d) => d.due_date),
      ]),
    [project, phases, iterations, datees, jalons, deliverables]
  );

  if (iterations === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  if (!axe) {
    return (
      <p className="max-w-[52ch] rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-body-sm text-on-surface-variant">
        Rien n&apos;est encore daté sur ce projet. Renseignez les dates prévues d&apos;une phase,
        d&apos;une itération ou d&apos;un jalon pour voir l&apos;échéancier se remplir.
      </p>
    );
  }

  const lignes: TimelineLigne[] = [];
  const ordonnees = [...phases].sort((a, b) => a.position - b.position || a.id - b.id);

  for (const phase of ordonnees) {
    const tonePhase = PHASE_STATUS_TONES[phase.status] ?? PHASE_STATUS_TONES.A_VENIR!;
    const jalonsPhase = jalons.filter((j) => j.phase_id === phase.id && j.date_prevue);
    const livrablesPhase = deliverables.filter((d) => d.phase_id === phase.id && d.due_date);

    lignes.push({
      id: `phase-${phase.id}`,
      libelle: phase.name,
      entete: true,
      suffixe: (
        <span className="flex-none text-label-sm text-outline">
          {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
        </span>
      ),
      bandes:
        phase.start_planned && phase.end_planned
          ? [
              {
                id: `b-phase-${phase.id}`,
                debut: phase.start_planned,
                fin: phase.end_planned,
                tone: `${tonePhase.chip} font-semibold`,
                detail: `${phase.name} — ${fmt(phase.start_planned)} → ${fmt(phase.end_planned)}`,
              },
            ]
          : [],
      // Jalons et livrables sont des INSTANTS : ils se posent sur la ligne de la
      // phase, jamais sous forme de bande.
      reperes: [
        ...jalonsPhase.map((j) => ({
          id: `j-${j.id}`,
          date: j.date_prevue as string,
          libelle: j.nom,
          tone: echeanceDepassee(j) ? "bg-error" : (JALON_STATUT_TONES[j.statut]?.dot ?? "bg-outline"),
          detail: `Jalon « ${j.nom} » — ${fmt(j.date_prevue)} · ${JALON_STATUT_LABELS[j.statut] ?? j.statut}`,
        })),
        ...livrablesPhase.map((d) => ({
          id: `d-${d.id}`,
          date: d.due_date as string,
          libelle: d.title,
          tone: "bg-status-review",
          detail: `Livrable « ${d.title} » attendu le ${fmt(d.due_date)} · ${
            DELIVERABLE_STATUS_LABELS[d.status] ?? d.status
          }`,
        })),
      ],
    });

    const iterationsPhase = parDate(
      (iterations ?? []).filter((i) => i.phase_id === phase.id),
      (i) => i.date_debut,
      (i) => i.position
    );

    for (const iteration of iterationsPhase) {
      const taches = parDate(
        datees.filter((t) => t.iteration_id === iteration.id),
        (t) => t.start_date,
        (t) => t.order
      );
      lignes.push({
        id: `it-${iteration.id}`,
        libelle: iteration.nom,
        niveau: 1,
        suffixe: (
          <span className="flex-none text-label-sm text-outline">
            {ITERATION_STATUT_LABELS[iteration.statut]}
          </span>
        ),
        bandes:
          iteration.date_debut && iteration.date_fin
            ? [
                {
                  id: `b-it-${iteration.id}`,
                  debut: iteration.date_debut,
                  fin: iteration.date_fin,
                  tone: "bg-primary/15 text-primary",
                  detail: `${iteration.nom} — ${fmt(iteration.date_debut)} → ${fmt(iteration.date_fin)}`,
                },
              ]
            : [],
      });
      for (const tache of taches) {
        lignes.push(ligneTache(tache, 2));
      }
    }

    // Les tâches datées sans itération restent rattachées à leur phase.
    const horsIteration = parDate(
      datees.filter(
        (t) => t.phase_id === phase.id && !iterationsPhase.some((i) => i.id === t.iteration_id)
      ),
      (t) => t.start_date,
      (t) => t.order
    );
    for (const tache of horsIteration) {
      lignes.push(ligneTache(tache, 1));
    }
  }

  // Un jalon de projet n'appartient à aucune phase : il lui faut sa propre ligne.
  const jalonsProjet = jalons.filter((j) => j.phase_id === null && j.date_prevue);
  if (jalonsProjet.length) {
    lignes.push({
      id: "jalons-projet",
      libelle: "Échéances du projet",
      entete: true,
      reperes: jalonsProjet.map((j) => ({
        id: `jp-${j.id}`,
        date: j.date_prevue as string,
        libelle: j.nom,
        tone: echeanceDepassee(j) ? "bg-error" : (JALON_STATUT_TONES[j.statut]?.dot ?? "bg-outline"),
        detail: `Jalon « ${j.nom} » — ${fmt(j.date_prevue)} · ${JALON_STATUT_LABELS[j.statut] ?? j.statut}`,
      })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[56ch] text-body-sm text-on-surface-variant">
          Ce que le projet a prévu, dans le temps. Les bandes portent une durée, les losanges
          un instant — un jalon et une échéance de livrable ne durent pas, ils tombent.
        </p>
        <Legende />
      </div>

      <Timeline
        lignes={lignes}
        debut={axe.debut}
        fin={axe.fin}
        aujourdhui={new Date().toISOString()}
      />

      {nonPlanifiees.length > 0 && (
        <section>
          <p className="text-label-sm uppercase text-outline mb-2">
            Non planifié — {nonPlanifiees.length} élément{nonPlanifiees.length > 1 ? "s" : ""}
          </p>
          {/* On ne leur invente PAS les dates de leur sprint : une date qu'on
              fabrique se lit ensuite comme une date qu'on a décidée. */}
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
            {nonPlanifiees.map((tache) => {
              const phase = phases.find((p) => p.id === tache.phase_id);
              return (
                <div key={tache.id} className="flex items-center gap-3 px-4 py-2">
                  <span className={`w-[6px] h-[6px] flex-none rounded-full ${toneFor(tache.categorie).dot}`} />
                  <span className="text-body-sm text-on-surface truncate">{tache.title}</span>
                  <span className="ml-auto flex-none text-label-md text-outline">
                    {phase?.name ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-label-md text-outline">
            Ces éléments n&apos;ont ni début ni échéance : ils n&apos;apparaissent pas sur
            l&apos;axe tant qu&apos;on ne les a pas datés.
          </p>
        </section>
      )}
    </div>
  );
}

function ligneTache(tache: Task, niveau: number): TimelineLigne {
  const tone = toneFor(tache.categorie);
  return {
    id: `t-${tache.id}`,
    libelle: tache.title,
    niveau,
    bandes: [
      {
        id: `b-t-${tache.id}`,
        debut: tache.start_date as string,
        fin: tache.due_date as string,
        tone: tone.chip,
        detail: `${tache.title} — ${fmt(tache.start_date)} → ${fmt(tache.due_date)} · ${
          tache.etat_libelle ?? ""
        }`,
      },
    ],
  };
}

function Legende() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-label-md text-outline">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-2.5 rounded-sm bg-status-doing-container" /> phase
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-2.5 rounded-sm bg-primary/15" /> itération
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-2.5 rounded-sm bg-status-todo-container" /> tâche
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rotate-45 rounded-[2px] bg-status-done" /> jalon
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rotate-45 rounded-[2px] bg-status-review" /> livrable
      </span>
    </div>
  );
}
