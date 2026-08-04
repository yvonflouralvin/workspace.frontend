"use client";

import type { EntreeCalendrier } from "@/app/lib/projects-api";

/** Ce que la liste et le calendrier partagent.
 *
 *  Les deux écrans montrent les mêmes objets sous deux angles ; dupliquer les
 *  teintes et les libellés ferait qu'une nature ajoutée d'un côté apparaîtrait
 *  sans couleur de l'autre.
 */

export const JOUR_MS = 86_400_000;

/** Teinte par nature. L'agenda mélange des objets très différents : sans code
 *  couleur stable, on ne distingue plus un rendez-vous d'une échéance. */
export const TEINTES: Record<EntreeCalendrier["type"], string> = {
  evenement: "bg-primary/15 text-primary",
  tache: "bg-status-todo-container text-on-surface-variant",
  jalon: "bg-tertiary/15 text-tertiary",
  iteration: "bg-secondary/15 text-secondary",
  phase: "bg-surface-container text-on-surface-variant",
};

export const NATURES: { cle: EntreeCalendrier["type"]; libelle: string }[] = [
  { cle: "evenement", libelle: "Rendez-vous" },
  { cle: "tache", libelle: "Tâches" },
  { cle: "jalon", libelle: "Jalons" },
  { cle: "iteration", libelle: "Itérations" },
  { cle: "phase", libelle: "Phases" },
];

export function minuit(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function lundi(d: Date): Date {
  const c = minuit(d);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
}

export function heure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function libelleNature(type: EntreeCalendrier["type"]): string {
  return NATURES.find((n) => n.cle === type)?.libelle ?? type;
}

/** Identifiant qui porte sa nature : deux objets de tables différentes peuvent
 *  avoir le même numéro, et le décodeur doit retrouver le bon. */
export function cleEntree(e: EntreeCalendrier): string {
  return `${e.type}-${e.id}`;
}

/** Les groupes du menu Affichage, avec le compte réel de chaque option. */
export function groupesAffichage(entrees: EntreeCalendrier[]) {
  const comptes = new Map<string, number>();
  for (const entree of entrees) {
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
        compte: entrees.filter((e) => e.type === n.cle).length,
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
}

/** Le panneau de survol, identique sur les deux écrans. */
export function ApercuEntree({ entree }: { entree: EntreeCalendrier }) {
  return (
    <div className="max-w-[16rem]">
      <p className="text-body-sm font-semibold text-on-surface">{entree.titre}</p>
      <p className="mt-0.5 text-label-md text-outline">
        {libelleNature(entree.type)}
        {entree.projet_nom ? ` · ${entree.projet_nom}` : ""}
      </p>
      {!entree.journee_entiere && (
        <p className="mt-1 text-label-md text-on-surface-variant">
          {heure(entree.debut)}
          {entree.fin ? ` – ${heure(entree.fin)}` : ""}
        </p>
      )}
      {entree.lieu && (
        <p className="mt-0.5 text-label-md text-on-surface-variant">{entree.lieu}</p>
      )}
      {entree.participants.length > 0 && (
        <p className="mt-0.5 text-label-md text-on-surface-variant">
          {entree.participants.join(", ")}
        </p>
      )}
      {entree.tags.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-1">
          {entree.tags.map((tag) => (
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
}
