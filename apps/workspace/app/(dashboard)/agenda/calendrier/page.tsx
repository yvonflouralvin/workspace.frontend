"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  ArrowBackOutlined,
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
import {
  ApercuEntree,
  JOUR_MS,
  NATURES,
  TEINTES,
  cleEntree,
  groupesAffichage,
  heure,
  libelleNature,
  lundi,
  minuit,
} from "@/components/agenda/entrees";

type Vue = "mois" | "semaine" | "jour";

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
  const groupes = useMemo(() => groupesAffichage(entrees ?? []), [entrees]);

  const retrouver = (id: string) => visibles.find((e) => cleEntree(e) === id) ?? null;

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

  const apercu = (e: EntreeCalendrier) => <ApercuEntree entree={e} />;

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
      <Link
        href="/agenda"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} /> Agenda
      </Link>

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
          groupes={groupes}
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
              id: cleEntree(e),
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
              id: cleEntree(e),
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
          title={libelleNature(ouverte.type)}
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
