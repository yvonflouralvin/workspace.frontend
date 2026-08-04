"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  CalendarMonthOutlined,
  OpenInFullOutlined,
  PlaceOutlined,
  ScheduleOutlined,
} from "@mui/icons-material";
import { MenuAffichage } from "@repo/ui/MenuAffichage";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { Toast } from "@repo/ui/Toast";
import { projectsApi, type EntreeCalendrier } from "@/app/lib/projects-api";
import { EditeurEvenement } from "@/components/projects/EditeurEvenement";
import {
  JOUR_MS,
  NATURES,
  TEINTES,
  cleEntree,
  groupesAffichage,
  heure,
  libelleNature,
  minuit,
} from "@/components/agenda/entrees";

/** Horizons proposés. Un agenda répond d'abord à « et maintenant ? » : la
 *  fenêtre par défaut est courte, on l'élargit si on cherche plus loin. */
const HORIZONS = [
  { cle: 7, libelle: "7 jours" },
  { cle: 30, libelle: "30 jours" },
  { cle: 90, libelle: "3 mois" },
] as const;

/** La page principale du module : ce qu'il y a À FAIRE, en liste.
 *
 *  Le calendrier répond à « où ça tombe dans le mois » ; il est bon pour poser
 *  un rendez-vous, mauvais pour lire une charge de travail — il faut balayer une
 *  grille pour reconstituer un ordre qui existe déjà. La liste, elle, part
 *  d'aujourd'hui et descend. C'est elle qui accueille.
 */
export default function AgendaPage() {
  const [entrees, setEntrees] = useState<EntreeCalendrier[] | null>(null);
  const [horizon, setHorizon] = useState<number>(30);
  // « Ce qui me concerne » est coché d'entrée : c'est MON agenda, pas celui du
  // workspace. On l'ouvre à tout le monde d'un clic.
  const [affichage, setAffichage] = useState<Set<string>>(
    () => new Set(["moi", ...NATURES.map((n) => `nature:${n.cle}`)])
  );
  const [ouverte, setOuverte] = useState<EntreeCalendrier | null>(null);
  const [editeur, setEditeur] = useState<{ id: number | null; jour: Date } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const aMoi = affichage.has("moi");
  const natures = useMemo(
    () => new Set([...affichage].filter((c) => c.startsWith("nature:")).map((c) => c.slice(7))),
    [affichage]
  );
  const tagsRetenus = useMemo(
    () => [...affichage].filter((c) => c.startsWith("tag:")).map((c) => c.slice(4)),
    [affichage]
  );

  // On remonte trente jours en arrière pour ramasser ce qui est EN RETARD :
  // une échéance dépassée est précisément ce qu'il ne faut pas rater.
  const bornes = useMemo(() => {
    const aujourdhui = minuit(new Date());
    return {
      depuis: new Date(aujourdhui.getTime() - 30 * JOUR_MS),
      jusqu_a: new Date(aujourdhui.getTime() + horizon * JOUR_MS),
    };
  }, [horizon]);

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
          (tagsRetenus.length === 0 || e.tags.some((t) => tagsRetenus.includes(t)))
      ),
    [entrees, natures, tagsRetenus]
  );

  const groupes = useMemo(() => groupesAffichage(entrees ?? []), [entrees]);

  /** Regroupement par jour d'ÉCHÉANCE, pas de début.
   *
   *  Une tâche qui a commencé il y a trois semaines et se termine demain se lit
   *  à demain : c'est la date qui exige quelque chose de moi. */
  const parJour = useMemo(() => {
    const aujourdhui = minuit(new Date()).getTime();
    const carte = new Map<number, EntreeCalendrier[]>();
    const retard: EntreeCalendrier[] = [];

    for (const entree of visibles) {
      const echeance = minuit(new Date(entree.fin ?? entree.debut)).getTime();
      if (echeance < aujourdhui) retard.push(entree);
      else carte.get(echeance)?.push(entree) ?? carte.set(echeance, [entree]);
    }

    const trier = (liste: EntreeCalendrier[]) =>
      [...liste].sort((a, b) => a.debut.localeCompare(b.debut) || a.titre.localeCompare(b.titre));

    return {
      retard: trier(retard),
      jours: [...carte.entries()]
        .sort(([a], [b]) => a - b)
        .map(([jour, liste]) => ({ jour, entrees: trier(liste) })),
    };
  }, [visibles]);

  const rien = parJour.retard.length === 0 && parJour.jours.length === 0;

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-sm text-on-surface">Agenda</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Ce qui vous attend, du plus proche au plus lointain : rendez-vous, échéances,
            jalons et itérations. Ce qui vient des projets s&apos;affiche en lecture — on le
            modifie là où il vit.
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Link
            href="/agenda/calendrier"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <CalendarMonthOutlined style={{ fontSize: 16 }} />
            Calendrier
          </Link>
          <button
            type="button"
            onClick={() => setEditeur({ id: null, jour: new Date() })}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Rendez-vous
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex overflow-hidden rounded-lg border border-outline-soft">
          {HORIZONS.map((h) => (
            <button
              key={h.cle}
              type="button"
              aria-pressed={horizon === h.cle}
              onClick={() => setHorizon(h.cle)}
              className={`h-8 border-l border-outline-soft px-3 text-body-sm transition-colors first:border-l-0 ${
                horizon === h.cle
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {h.libelle}
            </button>
          ))}
        </span>
        <MenuAffichage
          groupes={groupes}
          selection={affichage}
          onChange={setAffichage}
          // « moi » et les cinq natures sont cochés d'origine : les compter
          // ferait afficher « 6 » en permanence, et la pastille cesserait de
          // signaler qu'on a restreint quelque chose.
          parDefaut={NATURES.length + 1}
        />
      </div>

      {entrees === null && (
        <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
      )}

      {entrees !== null && rien && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center text-body-sm text-on-surface-variant">
          Rien à l&apos;horizon des {horizon} prochains jours.
        </p>
      )}

      {parJour.retard.length > 0 && (
        <section className="mt-6">
          <p className="mb-1.5 flex items-center gap-1.5 text-label-sm uppercase text-error">
            <ScheduleOutlined style={{ fontSize: 15 }} />
            En retard
            <span className="text-outline-variant">{parJour.retard.length}</span>
          </p>
          <div className="overflow-hidden rounded-2xl border border-error/40 bg-surface-container-lowest divide-y divide-hairline">
            {parJour.retard.map((entree) => (
              <Ligne key={cleEntree(entree)} entree={entree} onOuvrir={setOuverte} retard />
            ))}
          </div>
        </section>
      )}

      {parJour.jours.map(({ jour, entrees: liste }) => (
        <section key={jour} className="mt-6">
          <p className="mb-1.5 text-label-sm uppercase text-outline">
            {libelleJour(jour)}
            <span className="ml-2 text-outline-variant">{liste.length}</span>
          </p>
          <div className="overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            {liste.map((entree) => (
              <Ligne key={cleEntree(entree)} entree={entree} onOuvrir={setOuverte} />
            ))}
          </div>
        </section>
      ))}

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
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  Modifier
                </button>
              ) : (
                ouverte.lien && (
                  <Link
                    href={ouverte.lien}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
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
                className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
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
          <dl className="mt-4 divide-y divide-hairline rounded-2xl border border-outline-soft">
            <LigneDetail label="Quand">
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
            </LigneDetail>
            {ouverte.lieu && (
              <LigneDetail label="Lieu">
                <span className="inline-flex items-center gap-1">
                  <PlaceOutlined style={{ fontSize: 15 }} />
                  {ouverte.lieu}
                </span>
              </LigneDetail>
            )}
            {ouverte.participants.length > 0 && (
              <LigneDetail label="Participants">{ouverte.participants.join(", ")}</LigneDetail>
            )}
            {ouverte.tags.length > 0 && (
              <LigneDetail label="Étiquettes">{ouverte.tags.join(", ")}</LigneDetail>
            )}
            {ouverte.detail && <LigneDetail label="Détail">{ouverte.detail}</LigneDetail>}
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

function libelleJour(jour: number): string {
  const aujourdhui = minuit(new Date()).getTime();
  if (jour === aujourdhui) return "Aujourd'hui";
  if (jour === aujourdhui + JOUR_MS) return "Demain";
  return new Date(jour).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function Ligne({
  entree,
  onOuvrir,
  retard,
}: {
  entree: EntreeCalendrier;
  onOuvrir: (entree: EntreeCalendrier) => void;
  retard?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOuvrir(entree)}
      className="flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-container-low"
    >
      <span
        className={`flex-none rounded-full px-2 py-0.5 text-label-md font-semibold ${
          TEINTES[entree.type]
        }`}
      >
        {libelleNature(entree.type)}
      </span>
      <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">{entree.titre}</span>
      {entree.tags.map((tag) => (
        <span
          key={tag}
          className="flex-none rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"
        >
          {tag}
        </span>
      ))}
      {entree.projet_nom && (
        <span className="flex-none max-w-[180px] truncate text-label-md text-outline">
          {entree.projet_nom}
        </span>
      )}
      <span
        className={`w-[92px] flex-none text-right text-label-md tabular-nums ${
          retard ? "text-error" : "text-outline"
        }`}
      >
        {retard
          ? new Date(entree.fin ?? entree.debut).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })
          : entree.journee_entiere
            ? "journée"
            : heure(entree.debut)}
      </span>
    </button>
  );
}

function LigneDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="flex-none text-body-sm text-on-surface-variant">{label}</dt>
      <dd className="text-right text-body-sm text-on-surface">{children}</dd>
    </div>
  );
}
