"use client";

import { Icon } from "@repo/ui/Icon";

import { WIDGETS_PALETTE, creerNoeud, definition } from "@repo/site-widgets/catalogue";
import { ascendance, inserer, insererApres, trouver } from "@repo/site-widgets/arbre";
import type { Noeud } from "@repo/site-widgets/types";

import { useBuilder } from "./store";

/** Où poser un widget que l'utilisateur vient de choisir ?
 *
 *  Règle : dans la colonne courante, juste après le bloc sélectionné. Si rien
 *  n'est sélectionné, dans la dernière colonne de la dernière section. C'est
 *  la règle qui demande le moins d'explications : le bloc apparaît là où on
 *  regardait.
 *
 *  Renvoie `null` quand la page n'a encore aucune section — l'appelant doit
 *  alors dire quoi faire plutôt que de laisser le clic sans effet.
 */
export function pointDInsertion(
  arbre: Noeud,
  selection: string | null,
): { parent: string; apres: string | null } | null {
  if (selection) {
    const chemin = ascendance(arbre, selection);
    const colonne = [...chemin].reverse().find((n) => n.type === "colonne");
    if (colonne) {
      const selectionne = trouver(arbre, selection);
      const estEnfantDirect = (colonne.enfants ?? []).some((e) => e.id === selection);
      return { parent: colonne.id, apres: estEnfantDirect ? (selectionne?.id ?? null) : null };
    }
    const section = [...chemin].reverse().find((n) => n.type === "section");
    const premiere = section?.enfants?.[0];
    if (premiere) return { parent: premiere.id, apres: null };
  }

  const derniereSection = (arbre.enfants ?? []).at(-1);
  const derniereColonne = derniereSection?.enfants?.at(-1);
  if (derniereColonne) return { parent: derniereColonne.id, apres: null };
  return null;
}

/** Le type MIME du glissé.
 *
 *  Un type à nous, et non `text/plain` : le canevas ne doit accepter QUE ce qui
 *  vient de la palette. Sans lui, une sélection de texte traînée depuis une
 *  autre fenêtre déclencherait une insertion. */
export const MIME_WIDGET = "application/x-website-widget";

export function Palette({ onSansSection }: { onSansSection: () => void }) {
  const { arbre, selection, appliquer, selectionner } = useBuilder();

  function poser(type: string) {
    const point = pointDInsertion(arbre, selection);
    if (!point) {
      onSansSection();
      return;
    }
    const noeud = creerNoeud(type);
    appliquer((a) =>
      point.apres ? insererApres(a, point.apres, noeud) : inserer(a, point.parent, noeud),
    );
    selectionner(noeud.id);
  }

  return (
    <div className="p-3">
      <p className="mb-2 text-label-sm text-on-surface-variant">
        Cliquez pour poser un bloc après celui qui est sélectionné — ou glissez-le sur le
        canevas.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {WIDGETS_PALETTE.map((widget) => (
          <button
            key={widget.cle}
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData(MIME_WIDGET, widget.cle);
            }}
            onClick={() => poser(widget.cle)}
            title={widget.description ?? widget.libelle}
            className="flex flex-col items-center gap-1 rounded-xl border border-outline-soft bg-surface-container-lowest px-2 py-3 text-center transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name={widget.icone} className="text-[20px]" />
            <span className="text-label-sm leading-tight">{widget.libelle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { definition };
