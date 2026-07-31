"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarMonthOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  OpenInFullOutlined,
  TimelineOutlined,
} from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { CalendrierMois, type EvenementCalendrier } from "@repo/ui/CalendrierMois";
import { Timeline, type Graduation, type TimelineLigne } from "@repo/ui/Timeline";
import {
  DELIVERABLE_STATUS_LABELS,
  PHASE_STATUS_LABELS,
  PHASE_STATUS_TONES,
  toneFor,
  type Deliverable,
  type Task,
} from "@/app/lib/projects-api";
import { ITERATION_STATUT_LABELS, iterationsApi, type Iteration } from "@/app/lib/iterations-api";
import {
  JALON_ROLE_LABELS,
  JALON_STATUT_LABELS,
  JALON_STATUT_TONES,
  echeanceDepassee,
  type Jalon,
} from "@/app/lib/jalons-api";
import { useProject } from "../project-context";

const JOUR = 86_400_000;

type Mode = "frise" | "calendrier";
type Couche = "phases" | "iterations" | "taches" | "jalons" | "livrables";

const COUCHES: { cle: Couche; label: string; pastille: string }[] = [
  { cle: "phases", label: "Phases", pastille: "bg-status-doing-container" },
  { cle: "iterations", label: "Itérations", pastille: "bg-primary/20" },
  { cle: "taches", label: "Tâches", pastille: "bg-status-todo-container" },
  { cle: "jalons", label: "Jalons", pastille: "bg-status-done" },
  { cle: "livrables", label: "Livrables", pastille: "bg-status-review" },
];

/** Largeur de la fenêtre, en jours, selon l'échelle. Le zoom ne filtre rien : il
 *  change la quantité de temps qu'on regarde d'un coup. */
const FENETRE: Record<Graduation, number> = { mois: 240, semaine: 56, jour: 21 };

function ajouter(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * JOUR);
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function libelleFenetre(debut: Date, fin: Date, graduation: Graduation): string {
  const options: Intl.DateTimeFormatOptions =
    graduation === "mois"
      ? { month: "short", year: "numeric" }
      : { day: "numeric", month: "short" };
  return `${debut.toLocaleDateString("fr-FR", options)} → ${fin.toLocaleDateString("fr-FR", options)}`;
}

export default function TimelinePage() {
  const { projectId, project, phases, tasks, deliverables, jalons } = useProject();
  const [iterations, setIterations] = useState<Iteration[] | null>(null);

  const [mode, setMode] = useState<Mode>("frise");
  const [graduation, setGraduation] = useState<Graduation>("mois");
  // Ancre de la fenêtre : ce qu'on REGARDE, indépendant de ce que les données
  // couvrent. C'est ce qui permet d'aller au-delà du projet, avant comme après.
  const [ancre, setAncre] = useState<Date>(() => ajouter(new Date(), -80));
  const [masquees, setMasquees] = useState<Couche[]>([]);
  // Sélection = l'identifiant composite posé à la construction (« t-42 »,
  // « phase-3 »…). Le décoder ici garde les composants génériques ignorants.
  const [selection, setSelection] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    iterationsApi
      .listProjet(projectId)
      .then(setIterations)
      .catch(() => setIterations([]));
  }, [projectId]);

  const visible = (couche: Couche) => !masquees.includes(couche);
  const basculer = (couche: Couche) =>
    setMasquees((m) => (m.includes(couche) ? m.filter((c) => c !== couche) : [...m, couche]));

  const datees = useMemo(() => tasks.filter((t) => t.start_date && t.due_date), [tasks]);
  const nonPlanifiees = tasks.filter((t) => !t.start_date || !t.due_date);

  const fenetre = useMemo(() => {
    if (mode === "calendrier") {
      return {
        debut: new Date(ancre.getFullYear(), ancre.getMonth(), 1),
        fin: new Date(ancre.getFullYear(), ancre.getMonth() + 1, 0),
      };
    }
    return { debut: ancre, fin: ajouter(ancre, FENETRE[graduation]) };
  }, [mode, graduation, ancre]);

  function toutLeProjet() {
    const dates = [
      project.start_date,
      project.due_date,
      ...phases.flatMap((p) => [p.start_planned, p.end_planned]),
      ...(iterations ?? []).flatMap((i) => [i.date_debut, i.date_fin]),
      ...datees.flatMap((t) => [t.start_date, t.due_date]),
      ...jalons.map((j) => j.date_prevue),
      ...deliverables.map((d) => d.due_date),
    ]
      .filter(Boolean)
      .map((d) => new Date(d as string).getTime());
    if (!dates.length) return;
    const min = new Date(Math.min(...dates) - 7 * JOUR);
    const etendue = Math.round((Math.max(...dates) - Math.min(...dates)) / JOUR) + 14;
    setMode("frise");
    setGraduation(etendue > 120 ? "mois" : etendue > 40 ? "semaine" : "jour");
    setAncre(min);
  }

  function deplacer(sens: 1 | -1) {
    if (mode === "calendrier") {
      setAncre((a) => new Date(a.getFullYear(), a.getMonth() + sens, 1));
      return;
    }
    // Un demi-écran : il reste toujours une moitié commune entre deux vues, sans
    // quoi on perd le fil de ce qu'on regardait.
    setAncre((a) => ajouter(a, sens * Math.round(FENETRE[graduation] / 2)));
  }

  function aujourdhui() {
    if (mode === "calendrier") {
      setAncre(new Date());
      return;
    }
    // Le jour courant au premier tiers : on voit surtout ce qui vient.
    setAncre(ajouter(new Date(), -Math.round(FENETRE[graduation] / 3)));
  }

  if (iterations === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  const ordonnees = [...phases].sort((a, b) => a.position - b.position || a.id - b.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[52ch] text-body-sm text-on-surface-variant">
          Ce que le projet a prévu, dans le temps. Les bandes portent une durée, les losanges
          un instant — un jalon et une échéance de livrable ne durent pas, ils tombent.
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Segmente
            valeur={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { valeur: "frise", label: "Frise", icone: <TimelineOutlined style={{ fontSize: 15 }} /> },
              {
                valeur: "calendrier",
                label: "Calendrier",
                icone: <CalendarMonthOutlined style={{ fontSize: 15 }} />,
              },
            ]}
          />
          {mode === "frise" && (
            <Segmente
              valeur={graduation}
              onChange={(v) => setGraduation(v as Graduation)}
              options={[
                { valeur: "mois", label: "Mois" },
                { valeur: "semaine", label: "Semaine" },
                { valeur: "jour", label: "Jour" },
              ]}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BoutonIcone label="Période précédente" onClick={() => deplacer(-1)}>
          <ChevronLeftOutlined style={{ fontSize: 18 }} />
        </BoutonIcone>
        <BoutonIcone label="Période suivante" onClick={() => deplacer(1)}>
          <ChevronRightOutlined style={{ fontSize: 18 }} />
        </BoutonIcone>
        <BoutonTexte onClick={aujourdhui}>Aujourd&apos;hui</BoutonTexte>
        <BoutonTexte onClick={toutLeProjet}>Tout le projet</BoutonTexte>
        <span className="text-body-sm font-medium text-on-surface">
          {mode === "calendrier"
            ? ancre.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
            : libelleFenetre(fenetre.debut, fenetre.fin, graduation)}
        </span>

        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {COUCHES.map((couche) => (
            <button
              key={couche.cle}
              type="button"
              aria-pressed={visible(couche.cle)}
              onClick={() => basculer(couche.cle)}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-label-md transition-colors ${
                visible(couche.cle)
                  ? "border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
                  : "border-transparent text-outline-variant line-through"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-sm ${couche.pastille}`} />
              {couche.label}
            </button>
          ))}
        </span>
      </div>

      {mode === "frise" ? (
        <Timeline
          lignes={construireLignes()}
          debut={fenetre.debut.toISOString()}
          fin={fenetre.fin.toISOString()}
          graduation={graduation}
          aujourdhui={new Date().toISOString()}
          largeurMinPiste={graduation === "jour" ? 1100 : graduation === "semaine" ? 900 : 720}
          onSelectionner={setSelection}
          vide={<Rien>Rien à afficher avec ces filtres.</Rien>}
        />
      ) : (
        <CalendrierMois
          mois={ancre.toISOString()}
          evenements={construireEvenements()}
          aujourdhui={new Date().toISOString()}
          onSelectionner={setSelection}
          vide={<Rien>Rien ce mois-ci.</Rien>}
        />
      )}

      {selection && <Apercu identifiant={selection} onClose={() => setSelection(null)} />}

      {nonPlanifiees.length > 0 && visible("taches") && (
        <section>
          <p className="text-label-sm uppercase text-outline mb-2">
            Non planifié — {nonPlanifiees.length} élément{nonPlanifiees.length > 1 ? "s" : ""}
          </p>
          {/* On ne leur invente PAS les dates de leur sprint : une date fabriquée
              se lit ensuite comme une date qu'on a décidée. */}
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
            {nonPlanifiees.map((tache) => (
              <div key={tache.id} className="flex items-center gap-3 px-4 py-2">
                <span className={`w-[6px] h-[6px] flex-none rounded-full ${toneFor(tache.categorie).dot}`} />
                <span className="text-body-sm text-on-surface truncate">{tache.title}</span>
                <span className="ml-auto flex-none text-label-md text-outline">
                  {phases.find((p) => p.id === tache.phase_id)?.name ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  /** Le détail d'un objet, calculé UNE FOIS. Le survol et le clic montrent la
   *  même chose : deux constructions divergeraient au premier changement.
   *
   *  Le décodage de l'identifiant vit ICI : `Timeline` et `CalendrierMois` ne
   *  connaissent que des chaînes opaques, c'est ce qui les garde réutilisables. */
  function details(identifiant: string) {
    // « phase-3 », « t-42 », « j-7 » : le type, puis le numéro. Une bande et un
    // repère du même objet portent le MÊME identifiant.
    const [type, brut] = identifiant.split("-");
    const numero = Number(brut);
    const base = `/projects/${projectId}`;

    let titre = "Aperçu";
    let lignes: { libelle: string; valeur: ReactNode }[] = [];
    let destination: string | null = null;
    let mention: string | null = null;

    if (type === "phase") {
      const phase = phases.find((p) => p.id === numero);
      if (phase) {
        titre = phase.name;
        destination = `${base}/phases/${phase.id}`;
        lignes = [
          { libelle: "Type", valeur: "Phase" },
          { libelle: "Statut", valeur: PHASE_STATUS_LABELS[phase.status] ?? phase.status },
          { libelle: "Prévu", valeur: `${fmt(phase.start_planned)} → ${fmt(phase.end_planned)}` },
          { libelle: "Réel", valeur: `${fmt(phase.start_real)} → ${fmt(phase.end_real)}` },
          { libelle: "Éléments", valeur: String(phase.task_count ?? 0) },
        ];
      }
    } else if (type === "it") {
      const iteration = (iterations ?? []).find((i) => i.id === numero);
      if (iteration) {
        titre = iteration.nom;
        // Une itération n'a pas de page à elle : on ouvre celle de sa phase.
        destination = `${base}/phases/${iteration.phase_id}/iterations`;
        mention = "Les itérations se gèrent depuis leur phase.";
        lignes = [
          { libelle: "Type", valeur: "Itération" },
          { libelle: "Statut", valeur: ITERATION_STATUT_LABELS[iteration.statut] },
          { libelle: "Fenêtre", valeur: `${fmt(iteration.date_debut)} → ${fmt(iteration.date_fin)}` },
          {
            libelle: "Engagé",
            valeur: `${iteration.taches_rattachees} élément${
              iteration.taches_rattachees > 1 ? "s" : ""
            } · ${iteration.points_rattaches}${
              iteration.capacite != null ? ` sur ${iteration.capacite}` : ""
            }`,
          },
        ];
      }
    } else if (type === "t") {
      const tache = tasks.find((t) => t.id === numero);
      if (tache) {
        titre = tache.title;
        destination = `${base}/tasks/${tache.id}`;
        lignes = [
          { libelle: "Type", valeur: "Tâche" },
          { libelle: "État", valeur: tache.etat_libelle ?? "—" },
          { libelle: "Phase", valeur: phases.find((p) => p.id === tache.phase_id)?.name ?? "—" },
          { libelle: "Prévu", valeur: `${fmt(tache.start_date)} → ${fmt(tache.due_date)}` },
          { libelle: "Estimation", valeur: tache.estimate != null ? String(tache.estimate) : "—" },
        ];
      }
    } else if (type === "j" || type === "jp") {
      const jalon = jalons.find((j) => j.id === numero);
      if (jalon) {
        titre = jalon.nom;
        destination = `${base}/jalons/${jalon.id}`;
        lignes = [
          { libelle: "Type", valeur: "Jalon" },
          { libelle: "Statut", valeur: JALON_STATUT_LABELS[jalon.statut] ?? jalon.statut },
          { libelle: "Échéance", valeur: fmt(jalon.date_prevue) },
          { libelle: "Bloquant", valeur: jalon.bloquant ? "Oui" : "Non" },
        ];
        if (echeanceDepassee(jalon)) mention = `Échéance dépassée — ${fmt(jalon.date_prevue)}`;
      }
    } else if (type === "d") {
      const livrable = deliverables.find((d) => d.id === numero);
      if (livrable) {
        titre = livrable.title;
        destination = `${base}/deliverables/${livrable.id}`;
        lignes = [
          { libelle: "Type", valeur: "Livrable" },
          {
            libelle: "Statut",
            valeur: DELIVERABLE_STATUS_LABELS[livrable.status] ?? livrable.status,
          },
          { libelle: "Attendu", valeur: fmt(livrable.due_date) },
          { libelle: "Phase", valeur: livrable.phase_name ?? "—" },
        ];
      }
    }

    return { titre, lignes, destination, mention };
  }

  /** Panneau de survol : le même détail, en plus court, avec la sortie directe. */
  function Survol({ identifiant }: { identifiant: string }) {
    const { titre, lignes, destination, mention } = details(identifiant);
    return (
      <div className="space-y-1.5">
        <p className="text-body-sm font-semibold text-on-surface leading-snug">{titre}</p>
        {mention && <p className="text-label-md text-error">{mention}</p>}
        <dl className="space-y-0.5">
          {lignes.map((ligne) => (
            <div key={ligne.libelle} className="flex items-baseline justify-between gap-3">
              <dt className="text-label-md text-outline">{ligne.libelle}</dt>
              <dd className="text-label-md text-on-surface-variant text-right">{ligne.valeur}</dd>
            </div>
          ))}
        </dl>
        {destination && (
          <Link
            href={destination}
            className="inline-flex items-center gap-1 pt-1 text-label-md font-semibold text-primary hover:underline"
          >
            Ouvrir la page
            <ChevronRightOutlined style={{ fontSize: 14 }} />
          </Link>
        )}
      </div>
    );
  }

  function Apercu({ identifiant, onClose }: { identifiant: string; onClose: () => void }) {
    const { titre, lignes, destination, mention } = details(identifiant);
    return (
      <RightDrawer
        title="Aperçu rapide"
        onClose={onClose}
        width="md:w-[420px] md:max-w-[92vw]"
        footer={
          <div className="flex items-center gap-2 w-full">
            {destination && (
              <button
                type="button"
                onClick={() => router.push(destination as string)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <OpenInFullOutlined style={{ fontSize: 15 }} />
                Ouvrir la page
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Fermer
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <h3 className="font-display text-headline-sm text-on-surface">{titre}</h3>
          {mention && <p className="text-body-sm text-error">{mention}</p>}
          <dl className="rounded-2xl border border-outline-soft divide-y divide-hairline">
            {lignes.map((ligne) => (
              <div key={ligne.libelle} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-body-sm text-on-surface-variant">{ligne.libelle}</dt>
                <dd className="text-body-sm text-on-surface text-right">{ligne.valeur}</dd>
              </div>
            ))}
          </dl>
          {!lignes.length && (
            <p className="text-body-sm text-on-surface-variant">
              Cet élément n&apos;est plus disponible — il a peut-être été supprimé.
            </p>
          )}
        </div>
      </RightDrawer>
    );
  }

  // ── Construction des données d'affichage ─────────────────────────────────

  function construireLignes(): TimelineLigne[] {
    const lignes: TimelineLigne[] = [];

    for (const phase of ordonnees) {
      const tonePhase = PHASE_STATUS_TONES[phase.status] ?? PHASE_STATUS_TONES.A_VENIR!;
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
          visible("phases") && phase.start_planned && phase.end_planned
            ? [
                {
                  id: `phase-${phase.id}`,
                  debut: phase.start_planned,
                  fin: phase.end_planned,
                  libelle: phase.name,
                  tone: `${tonePhase.chip} font-semibold`,
                  detail: `Phase ${phase.name} — ${fmt(phase.start_planned)} → ${fmt(phase.end_planned)}`,
                  apercu: <Survol identifiant={`phase-${phase.id}`} />,
                },
              ]
            : [],
        reperes: [
          ...(visible("jalons")
            ? jalons
                .filter((j) => j.phase_id === phase.id && j.date_prevue)
                .map((j) => ({
                  id: `j-${j.id}`,
                  date: j.date_prevue as string,
                  libelle: j.nom,
                  tone: echeanceDepassee(j)
                    ? "bg-error"
                    : (JALON_STATUT_TONES[j.statut]?.dot ?? "bg-outline"),
                  detail: `Jalon ${j.nom} — ${fmt(j.date_prevue)}`,
                  apercu: <Survol identifiant={`j-${j.id}`} />,
                }))
            : []),
          ...(visible("livrables")
            ? deliverables
                .filter((d) => d.phase_id === phase.id && d.due_date)
                .map((d) => ({
                  id: `d-${d.id}`,
                  date: d.due_date as string,
                  libelle: d.title,
                  tone: "bg-status-review",
                  detail: `Livrable ${d.title} — ${fmt(d.due_date)}`,
                  apercu: <Survol identifiant={`d-${d.id}`} />,
                }))
            : []),
        ],
      });

      const iterationsPhase = parDate(
        (iterations ?? []).filter((i) => i.phase_id === phase.id),
        (i) => i.date_debut,
        (i) => i.position
      );

      for (const iteration of iterationsPhase) {
        if (visible("iterations")) {
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
                      id: `it-${iteration.id}`,
                      debut: iteration.date_debut,
                      fin: iteration.date_fin,
                      libelle: iteration.nom,
                      tone: "bg-primary/15 text-primary",
                      detail: `${iteration.nom} — ${fmt(iteration.date_debut)} → ${fmt(iteration.date_fin)}`,
                      apercu: <Survol identifiant={`it-${iteration.id}`} />,
                    },
                  ]
                : [],
          });
        }
        if (visible("taches")) {
          for (const tache of parDate(
            datees.filter((t) => t.iteration_id === iteration.id),
            (t) => t.start_date,
            (t) => t.order
          )) {
            lignes.push(ligneTache(tache, visible("iterations") ? 2 : 1, <Survol identifiant={`t-${tache.id}`} />));
          }
        }
      }

      if (visible("taches")) {
        for (const tache of parDate(
          datees.filter(
            (t) => t.phase_id === phase.id && !iterationsPhase.some((i) => i.id === t.iteration_id)
          ),
          (t) => t.start_date,
          (t) => t.order
        )) {
          lignes.push(ligneTache(tache, 1, <Survol identifiant={`t-${tache.id}`} />));
        }
      }
    }

    // Un jalon de projet n'appartient à aucune phase : il lui faut sa ligne.
    const jalonsProjet = jalons.filter((j) => j.phase_id === null && j.date_prevue);
    if (visible("jalons") && jalonsProjet.length) {
      lignes.push({
        id: "jalons-projet",
        libelle: "Échéances du projet",
        entete: true,
        reperes: jalonsProjet.map((j) => ({
          id: `jp-${j.id}`,
          date: j.date_prevue as string,
          libelle: j.nom,
          tone: echeanceDepassee(j) ? "bg-error" : (JALON_STATUT_TONES[j.statut]?.dot ?? "bg-outline"),
          detail: `Jalon ${j.nom} — ${fmt(j.date_prevue)}`,
          apercu: <Survol identifiant={`j-${j.id}`} />,
        })),
      });
    }
    return lignes;
  }

  function construireEvenements(): EvenementCalendrier[] {
    const evenements: EvenementCalendrier[] = [];

    if (visible("phases")) {
      for (const phase of ordonnees) {
        if (!phase.start_planned || !phase.end_planned) continue;
        const tone = PHASE_STATUS_TONES[phase.status] ?? PHASE_STATUS_TONES.A_VENIR!;
        evenements.push({
          id: `phase-${phase.id}`,
          debut: phase.start_planned,
          fin: phase.end_planned,
          libelle: phase.name,
          tone: `${tone.chip} font-semibold`,
          detail: `Phase ${phase.name}`,
          apercu: <Survol identifiant={`phase-${phase.id}`} />,
        });
      }
    }
    if (visible("iterations")) {
      for (const iteration of iterations ?? []) {
        if (!iteration.date_debut || !iteration.date_fin) continue;
        evenements.push({
          id: `it-${iteration.id}`,
          debut: iteration.date_debut,
          fin: iteration.date_fin,
          libelle: iteration.nom,
          tone: "bg-primary/15 text-primary",
          detail: `${iteration.nom} — ${ITERATION_STATUT_LABELS[iteration.statut]}`,
          apercu: <Survol identifiant={`it-${iteration.id}`} />,
        });
      }
    }
    if (visible("taches")) {
      for (const tache of datees) {
        evenements.push({
          id: `t-${tache.id}`,
          debut: tache.start_date as string,
          fin: tache.due_date as string,
          libelle: tache.title,
          tone: toneFor(tache.categorie).chip,
          detail: tache.title,
          apercu: <Survol identifiant={`t-${tache.id}`} />,
        });
      }
    }
    if (visible("jalons")) {
      for (const jalon of jalons) {
        if (!jalon.date_prevue) continue;
        evenements.push({
          id: `j-${jalon.id}`,
          debut: jalon.date_prevue,
          libelle: `◆ ${jalon.nom}`,
          instant: true,
          tone: echeanceDepassee(jalon)
            ? "bg-error-container text-on-error-container"
            : (JALON_STATUT_TONES[jalon.statut]?.chip ?? "bg-surface-container"),
          detail: `Jalon ${jalon.nom}`,
          apercu: <Survol identifiant={`j-${jalon.id}`} />,
        });
      }
    }
    if (visible("livrables")) {
      for (const livrable of deliverables) {
        if (!livrable.due_date) continue;
        evenements.push({
          id: `d-${livrable.id}`,
          debut: livrable.due_date,
          libelle: `◆ ${livrable.title}`,
          instant: true,
          tone: "bg-status-review-container text-status-review",
          detail: `Livrable ${livrable.title}`,
          apercu: <Survol identifiant={`d-${livrable.id}`} />,
        });
      }
    }
    return evenements;
  }
}

/** Sur un axe chronologique, les LIGNES aussi se lisent dans le temps : trier par
 *  position laissait Sprint 3 au-dessus de Sprint 2 parce qu'il avait été créé
 *  après. La date prime, le rang ne sert que de repli. */
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

function ligneTache(tache: Task, niveau: number, apercu: ReactNode): TimelineLigne {
  const tone = toneFor(tache.categorie);
  return {
    id: `t-${tache.id}`,
    libelle: tache.title,
    niveau,
    bandes: [
      {
        id: `t-${tache.id}`,
        debut: tache.start_date as string,
        fin: tache.due_date as string,
        libelle: tache.title,
        tone: tone.chip,
        // Nom accessible : la bande est trop étroite pour montrer son titre dès
        // qu'on dézoome, et un lecteur d'écran n'a que ça.
        detail: `${tache.title} — ${fmt(tache.start_date)} → ${fmt(tache.due_date)}`,
        apercu,
      },
    ],
  };
}



function Rien({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-center text-body-sm text-on-surface-variant">
      {children}
    </p>
  );
}

function Segmente({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: string; label: string; icone?: ReactNode }[];
  valeur: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-outline-soft overflow-hidden">
      {options.map((option) => (
        <button
          key={option.valeur}
          type="button"
          aria-pressed={valeur === option.valeur}
          onClick={() => onChange(option.valeur)}
          className={`inline-flex items-center gap-1.5 h-8 px-3 text-body-sm font-medium border-l border-outline-soft first:border-l-0 transition-colors ${
            valeur === option.valeur
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          {option.icone}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BoutonTexte({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
    >
      {children}
    </button>
  );
}

function BoutonIcone({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low transition-colors"
    >
      {children}
    </button>
  );
}



