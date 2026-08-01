"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  OpenInFullOutlined,
  PlaceOutlined,
  TodayOutlined,
} from "@mui/icons-material";
import { CalendrierMois } from "@repo/ui/CalendrierMois";
import { GrilleHoraire } from "@repo/ui/GrilleHoraire";
import { MenuAffichage } from "@repo/ui/MenuAffichage";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { Toast } from "@repo/ui/Toast";
import { projectsApi, type EntreeCalendrier } from "@/app/lib/projects-api";
import { EditeurEvenement } from "@/components/projects/EditeurEvenement";

type Vue = "mois" | "semaine" | "jour";

const JOUR_MS = 86_400_000;

/** Teinte par nature. Le calendrier mélange des objets très différents : sans
 *  code couleur stable, on ne distingue plus un rendez-vous d'une échéance. */
const TEINTES: Record<EntreeCalendrier["type"], string> = {
  evenement: "bg-primary/15 text-primary",
  tache: "bg-status-todo-container text-on-surface-variant",
  jalon: "bg-tertiary/15 text-tertiary",
  iteration: "bg-secondary/15 text-secondary",
  phase: "bg-surface-container text-on-surface-variant",
};

const NATURES: { cle: EntreeCalendrier["type"]; libelle: string }[] = [
  { cle: "evenement", libelle: "Rendez-vous" },
  { cle: "tache", libelle: "Tâches" },
  { cle: "jalon", libelle: "Jalons" },
  { cle: "iteration", libelle: "Itérations" },
  { cle: "phase", libelle: "Phases" },
];

function minuit(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function lundi(d: Date): Date {
  const c = minuit(d);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
}

/** Bornes chargées : toujours plus large que ce qui est affiché, pour que les
 *  barres qui débordent du mois se dessinent jusqu'au bord. */
function fenetre(vue: Vue, pivot: Date): { depuis: Date; jusqu_a: Date } {
  if (vue === "jour") {
    return { depuis: minuit(pivot), jusqu_a: new Date(minuit(pivot).getTime() + JOUR_MS) };
  }
  if (vue === "semaine") {
    const debut = lundi(pivot);
    return { depuis: debut, jusqu_a: new Date(debut.getTime() + 7 * JOUR_MS) };
  }
  const premier = new Date(pivot.getFullYear(), pivot.getMonth(), 1);
  const dernier = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 0);
  return { depuis: lundi(premier), jusqu_a: new Date(lundi(dernier).getTime() + 7 * JOUR_MS) };
}

function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendrierPage() {
  const [vue, setVue] = useState<Vue>("mois");
  const [pivot, setPivot] = useState(() => new Date());
  const [entrees, setEntrees] = useState<EntreeCalendrier[] | null>(null);
  // UNE seule sélection, préfixée par famille (`nature:`, `tag:`, `moi`) : le
  // menu ne connaît que des clés, et une famille de plus n'ajoute pas un état
  // de plus à tenir synchronisé.
  const [affichage, setAffichage] = useState<Set<string>>(
    () => new Set(NATURES.map((n) => `nature:${n.cle}`))
  );
  const aMoi = affichage.has("moi");
  const natures = useMemo(
    () => new Set([...affichage].filter((c) => c.startsWith("nature:")).map((c) => c.slice(7))),
    [affichage]
  );
  const tagsRetenus = useMemo(
    () => [...affichage].filter((c) => c.startsWith("tag:")).map((c) => c.slice(4)),
    [affichage]
  );
  const [ouverte, setOuverte] = useState<EntreeCalendrier | null>(null);
  const [editeur, setEditeur] = useState<{ id: number | null; jour: Date } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const bornes = useMemo(() => fenetre(vue, pivot), [vue, pivot]);

  const charger = useCallback(async () => {
    try {
      setEntrees(
        await projectsApi.calendrier({
          depuis: bornes.depuis.toISOString(),
          jusqu_a: bornes.jusqu_a.toISOString(),
          a_moi: aMoi,
        })
      );
    } catch {
      setEntrees([]);
    }
  }, [bornes.depuis, bornes.jusqu_a, aMoi]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const visibles = useMemo(
    () =>
      (entrees ?? []).filter(
        (e) =>
          natures.has(e.type) &&
          // Aucune étiquette cochée = aucune contrainte. Dès qu'on en coche une,
          // ce qui n'en porte pas sort : c'est ce que « filtrer par étiquette »
          // veut dire.
          (tagsRetenus.length === 0 || e.tags.some((t) => tagsRetenus.includes(t)))
      ),
    [entrees, natures, tagsRetenus]
  );

  // Les étiquettes proposées sont celles RÉELLEMENT présentes dans la fenêtre,
  // avec leur compte : une liste figée proposerait des filtres qui ne donnent
  // rien.
  const groupesAffichage = useMemo(() => {
    const comptes = new Map<string, number>();
    for (const entree of entrees ?? []) {
      for (const tag of entree.tags) comptes.set(tag, (comptes.get(tag) ?? 0) + 1);
    }
    return [
      {
        cle: "portee",
        libelle: "Portée",
        options: [{ cle: "moi", libelle: "Ce qui me concerne" }],
      },
      {
        cle: "nature",
        libelle: "Nature",
        options: NATURES.map((n) => ({
          cle: `nature:${n.cle}`,
          libelle: n.libelle,
          teinte: TEINTES[n.cle].split(" ")[0],
          compte: (entrees ?? []).filter((e) => e.type === n.cle).length,
        })),
      },
      {
        cle: "tags",
        libelle: "Étiquettes",
        vide: "Rien d'étiqueté sur cette période.",
        options: [...comptes.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([tag, compte]) => ({ cle: `tag:${tag}`, libelle: tag, compte })),
      },
    ];
  }, [entrees]);

  // Un identifiant qui porte sa nature : deux objets de tables différentes
  // peuvent avoir le même numéro, et le décodeur doit retrouver le bon.
  const cle = (e: EntreeCalendrier) => `${e.type}-${e.id}`;
  const retrouver = (id: string) => visibles.find((e) => cle(e) === id) ?? null;

  const jours = useMemo(() => {
    if (vue === "jour") return [minuit(pivot).toISOString()];
    if (vue === "semaine") {
      const debut = lundi(pivot);
      return Array.from({ length: 7 }, (_, i) =>
        new Date(debut.getTime() + i * JOUR_MS).toISOString()
      );
    }
    return [];
  }, [vue, pivot]);

  function decaler(sens: number) {
    const suivant = new Date(pivot);
    if (vue === "mois") suivant.setMonth(suivant.getMonth() + sens);
    else if (vue === "semaine") suivant.setDate(suivant.getDate() + 7 * sens);
    else suivant.setDate(suivant.getDate() + sens);
    setPivot(suivant);
  }

  const titre =
    vue === "mois"
      ? pivot.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : vue === "semaine"
        ? `Semaine du ${lundi(pivot).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
        : pivot.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const apercu = (e: EntreeCalendrier) => (
    <div className="max-w-[16rem]">
      <p className="text-body-sm font-semibold text-on-surface">{e.titre}</p>
      <p className="mt-0.5 text-label-md text-outline">
        {NATURES.find((n) => n.cle === e.type)?.libelle}
        {e.projet_nom ? ` · ${e.projet_nom}` : ""}
      </p>
      {!e.journee_entiere && (
        <p className="mt-1 text-label-md text-on-surface-variant">
          {heure(e.debut)}
          {e.fin ? ` – ${heure(e.fin)}` : ""}
        </p>
      )}
      {e.lieu && <p className="mt-0.5 text-label-md text-on-surface-variant">{e.lieu}</p>}
      {e.participants.length > 0 && (
        <p className="mt-0.5 text-label-md text-on-surface-variant">
          {e.participants.join(", ")}
        </p>
      )}
      {e.tags.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-1">
          {e.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-container px-1.5 text-label-sm text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-sm text-on-surface first-letter:uppercase">
            {titre}
          </h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Tout ce qui a une date : vos rendez-vous, les échéances, les jalons et les
            itérations. Ce qui vient des projets s&apos;affiche en lecture — on le modifie
            là où il vit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditeur({ id: null, jour: pivot })}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Rendez-vous
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-lg border border-outline-soft overflow-hidden">
          <button
            type="button"
            aria-label="Période précédente"
            onClick={() => decaler(-1)}
            className="inline-flex h-8 w-8 items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <ChevronLeftOutlined style={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            onClick={() => setPivot(new Date())}
            className="inline-flex h-8 items-center gap-1.5 border-x border-outline-soft px-3 text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <TodayOutlined style={{ fontSize: 16 }} />
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            aria-label="Période suivante"
            onClick={() => decaler(1)}
            className="inline-flex h-8 w-8 items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <ChevronRightOutlined style={{ fontSize: 18 }} />
          </button>
        </span>

        <span className="inline-flex rounded-lg border border-outline-soft overflow-hidden">
          {(["mois", "semaine", "jour"] as Vue[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vue === v}
              onClick={() => setVue(v)}
              className={`h-8 px-3 text-body-sm border-l border-outline-soft first:border-l-0 capitalize transition-colors ${
                vue === v
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {v}
            </button>
          ))}
        </span>

        <span className="mx-1 w-px h-5 bg-outline-soft" />

        <MenuAffichage
          groupes={groupesAffichage}
          selection={affichage}
          onChange={setAffichage}
          // Les cinq natures sont cochées d'origine : les compter ferait
          // afficher « 5 » en permanence, et la pastille cesserait de signaler
          // qu'on a restreint quelque chose.
          parDefaut={NATURES.length}
        />
      </div>

      <div className="mt-4">
        {entrees === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : vue === "mois" ? (
          <CalendrierMois
            mois={pivot.toISOString()}
            aujourdhui={new Date().toISOString()}
            // Un agenda replie moins vite qu'une frise de projet : ici on vient
            // chercher ce qui tombe ce jour-là, pas la forme d'ensemble.
            couloirsMax={7}
            onSelectionner={(id) => setOuverte(retrouver(id))}
            vide={<p className="text-body-sm text-on-surface-variant">Rien ce mois-ci.</p>}
            evenements={visibles.map((e) => ({
              id: cle(e),
              debut: e.debut,
              fin: e.fin ?? undefined,
              libelle: e.titre,
              tone: TEINTES[e.type],
              detail: `${e.titre}${e.projet_nom ? ` — ${e.projet_nom}` : ""}`,
              apercu: apercu(e),
              instant: !e.fin || e.fin === e.debut,
            }))}
          />
        ) : (
          <GrilleHoraire
            jours={jours}
            aujourdhui={new Date().toISOString()}
            onSelectionner={(id) => setOuverte(retrouver(id))}
            creneaux={visibles.map((e) => ({
              id: cle(e),
              debut: e.debut,
              fin: e.fin ?? undefined,
              libelle: e.titre,
              tone: TEINTES[e.type],
              // Tout ce qui ne vient pas de l'agenda est une date, pas un
              // créneau : ça se pose dans le bandeau, pas sur une heure.
              journeeEntiere: e.journee_entiere || !e.est_evenement,
              detail: `${e.titre}${e.projet_nom ? ` — ${e.projet_nom}` : ""}`,
              apercu: apercu(e),
            }))}
          />
        )}
      </div>

      {ouverte && (
        <RightDrawer
          title={NATURES.find((n) => n.cle === ouverte.type)?.libelle ?? "Entrée"}
          onClose={() => setOuverte(null)}
          width="md:w-[420px] md:max-w-[92vw]"
          footer={
            <div className="flex w-full items-center gap-2">
              {ouverte.est_evenement ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditeur({ id: ouverte.id, jour: new Date(ouverte.debut) });
                    setOuverte(null);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Modifier
                </button>
              ) : (
                ouverte.lien && (
                  <Link
                    href={ouverte.lien}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    <OpenInFullOutlined style={{ fontSize: 15 }} />
                    Ouvrir la page
                  </Link>
                )
              )}
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => setOuverte(null)}
                className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Fermer
              </button>
            </div>
          }
        >
          <p className="font-display text-headline-sm text-on-surface">{ouverte.titre}</p>
          {ouverte.projet_nom && (
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{ouverte.projet_nom}</p>
          )}
          <dl className="mt-4 rounded-2xl border border-outline-soft divide-y divide-hairline">
            <Ligne label="Quand">
              {ouverte.journee_entiere
                ? new Date(ouverte.debut).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : `${new Date(ouverte.debut).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                  })} · ${heure(ouverte.debut)}${ouverte.fin ? ` – ${heure(ouverte.fin)}` : ""}`}
            </Ligne>
            {ouverte.lieu && (
              <Ligne label="Lieu">
                <span className="inline-flex items-center gap-1">
                  <PlaceOutlined style={{ fontSize: 15 }} />
                  {ouverte.lieu}
                </span>
              </Ligne>
            )}
            {ouverte.participants.length > 0 && (
              <Ligne label="Participants">{ouverte.participants.join(", ")}</Ligne>
            )}
            {ouverte.detail && <Ligne label="Détail">{ouverte.detail}</Ligne>}
          </dl>
        </RightDrawer>
      )}

      {editeur && (
        <EditeurEvenement
          evenementId={editeur.id}
          jour={editeur.jour}
          onClose={() => setEditeur(null)}
          onEnregistre={async (message) => {
            setEditeur(null);
            await charger();
            setToast(message);
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="flex-none text-body-sm text-on-surface-variant">{label}</dt>
      <dd className="text-right text-body-sm text-on-surface">{children}</dd>
    </div>
  );
}
