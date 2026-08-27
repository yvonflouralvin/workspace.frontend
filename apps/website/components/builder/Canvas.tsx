"use client";

import { useMemo, useState } from "react";
import { AddOutlined } from "@mui/icons-material";

import { RenduPage, contexteRendu } from "@repo/site-widgets/RenduPage";
import { creerNoeud } from "@repo/site-widgets/catalogue";
import { ascendance, inserer, insererApres, trouver } from "@repo/site-widgets/arbre";
import type { Noeud, Theme } from "@repo/site-widgets/types";

import { urlMediaEditeur } from "@/app/lib/api";
import { ChoixBloc } from "./ChoixBloc";
import { ChoixSection } from "./ChoixSection";
import { MIME_WIDGET } from "./Palette";
import { useBuilder } from "./store";

/** Largeurs de simulation. Ce sont les points de rupture réels de la feuille
 *  réactive, moins la barre de défilement : montrer 640 px exactement afficherait
 *  la vue tablette en croyant regarder le mobile. */
const LARGEURS: Record<string, number | undefined> = {
  bureau: undefined,
  tablette: 900,
  mobile: 420,
};

/** Le canevas rend la page avec LE MÊME composant que le site publié.
 *
 *  Il n'y ajoute que la couche de sélection : un cadre au survol, un cadre
 *  plein sur le bloc choisi. Tout le reste — espacements, couleurs, polices —
 *  vient du rendu partagé, ce qui rend « ce que je vois est ce qui sera
 *  publié » vrai par construction et non par discipline.
 */
export function Canvas({
  theme,
  entete,
  pied,
  titre,
  pages,
}: {
  theme: Theme;
  entete: Noeud | null;
  pied: Noeud | null;
  titre: string;
  pages: { chemin: string; titre: string }[];
}) {
  const { arbre, selection, cible, selectionner, appliquer } = useBuilder();
  const [survol, setSurvol] = useState<{ id: string; apres: boolean } | null>(null);
  const [choixSection, setChoixSection] = useState(false);
  /** La colonne qu'on remplit, et l'endroit où poser la petite fenêtre. */
  const [choixBloc, setChoixBloc] = useState<{ colonne: string; x: number; y: number } | null>(
    null,
  );

  /** Où tombe un widget lâché sur le canevas ?
   *
   *  On lit `data-n` sous le curseur, exactement comme pour la sélection : le
   *  widget ignore tout de cette mécanique. Le bloc visé donne sa colonne, et
   *  la moitié survolée dit avant ou après. Lâché sur une section ou une
   *  colonne vide, le widget tombe dedans.
   */
  function pointDeChute(evenement: React.DragEvent): { id: string; apres: boolean } | null {
    const element = (evenement.target as HTMLElement).closest("[data-n]");
    const id = element?.getAttribute("data-n");
    if (!id) return null;
    const rect = element!.getBoundingClientRect();
    return { id, apres: evenement.clientY - rect.top > rect.height / 2 };
  }

  function surSurvolGlisse(evenement: React.DragEvent<HTMLDivElement>) {
    if (!evenement.dataTransfer.types.includes(MIME_WIDGET)) return;
    evenement.preventDefault();
    evenement.dataTransfer.dropEffect = "copy";
    const chute = pointDeChute(evenement);
    if (chute?.id !== survol?.id || chute?.apres !== survol?.apres) setSurvol(chute);
  }

  function surDepot(evenement: React.DragEvent<HTMLDivElement>) {
    const type = evenement.dataTransfer.getData(MIME_WIDGET);
    setSurvol(null);
    if (!type) return;
    evenement.preventDefault();

    const chute = pointDeChute(evenement);
    const noeud = creerNoeud(type);
    appliquer((a) => {
      if (!chute) {
        // Lâché à côté de tout : dans la dernière colonne, comme un clic.
        const colonne = (a.enfants ?? []).at(-1)?.enfants?.at(-1);
        return colonne ? inserer(a, colonne.id, noeud) : a;
      }
      const vise = trouver(a, chute.id);
      if (!vise) return a;
      if (vise.type === "colonne") return inserer(a, vise.id, noeud);
      if (vise.type === "section") {
        const colonne = vise.enfants?.[0];
        return colonne ? inserer(a, colonne.id, noeud) : a;
      }
      const pere = [...ascendance(a, vise.id)].reverse().find((n) => n.type === "colonne");
      if (!pere) return a;
      const rang = (pere.enfants ?? []).findIndex((e) => e.id === vise.id);
      return chute.apres
        ? insererApres(a, vise.id, noeud)
        : inserer(a, pere.id, noeud, Math.max(0, rang));
    });
    selectionner(noeud.id);
  }

  const contexte = useMemo(
    () =>
      contexteRendu({
        theme,
        cible,
        edition: true,
        baseMedia: "/api/website-fichiers/public/medias",
      }),
    [theme, cible],
  );

  const charge = useMemo(
    () => ({
      site: { nom: titre, slug: "", langue: "fr", theme },
      domaine_principal: null,
      entete,
      pied,
      navigation: pages.map((p) => ({ ...p, est_accueil: p.chemin === "/" })),
      page: {
        chemin: "/",
        titre,
        description: null,
        image_og: null,
        indexable: true,
        arbre,
      },
      apercu: true,
    }),
    [arbre, entete, pied, pages, theme, titre],
  );

  const largeur = LARGEURS[cible];

  /** La sélection passe par un SEUL écouteur, sur le conteneur.
   *
   *  Poser un `onClick` par nœud obligerait chaque widget à connaître
   *  l'éditeur — or le même composant sert la page publique, où il n'y a rien
   *  à sélectionner. On lit `data-n` sur l'ancêtre le plus proche : le widget
   *  ignore tout de cette mécanique. */
  function surClic(evenement: React.MouseEvent<HTMLDivElement>) {
    // Le « + » d'une colonne vide est posé par le widget, qui ignore tout de
    // l'éditeur : c'est ici qu'on l'écoute, comme la sélection.
    const ajout = (evenement.target as HTMLElement).closest("[data-ajout]");
    if (ajout) {
      evenement.preventDefault();
      evenement.stopPropagation();
      const rect = ajout.getBoundingClientRect();
      setChoixBloc({
        colonne: ajout.getAttribute("data-ajout")!,
        x: rect.left,
        y: rect.bottom + 6,
      });
      return;
    }

    const cible = (evenement.target as HTMLElement).closest("[data-n]");
    evenement.preventDefault();
    if (!cible) {
      selectionner(null);
      return;
    }
    selectionner(cible.getAttribute("data-n"));
  }

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-surface-container-low p-4">
      <div
        className="w-full"
        style={{ maxWidth: largeur }}
      >
        <div
          onClick={surClic}
          onDragOver={surSurvolGlisse}
          onDragLeave={() => setSurvol(null)}
          onDrop={surDepot}
          className="builder-canvas overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5"
        >
          <RenduPage charge={charge} contexte={contexte} />
        </div>

        {/* Ajouter une section : c'est le seul geste qui n'a pas de bloc
            existant sur lequel cliquer, il lui faut donc sa propre porte. */}
        <AjoutSection onOuvrir={() => setChoixSection(true)} />

        <style>{`
          .builder-canvas [data-n] { outline: 1px dashed transparent; outline-offset: -1px; transition: outline-color .1s; cursor: pointer; }
          .builder-canvas:hover [data-n]:hover { outline-color: rgba(13,148,136,.45); }
          .builder-canvas [data-n="${selection ?? "__aucun__"}"] { outline: 2px solid #0d9488; outline-offset: -2px; }
          .builder-canvas a { cursor: pointer; }
          .builder-canvas [data-n="${survol?.id ?? "__aucun__"}"] {
            box-shadow: inset 0 ${survol?.apres ? "-3px" : "3px"} 0 0 #0d9488;
          }
        `}</style>
      </div>

      {choixSection && (
        <ChoixSection
          onChoisir={(section) => {
            appliquer((a) => inserer(a, a.id, section));
            selectionner(section.id);
            setChoixSection(false);
          }}
          onFermer={() => setChoixSection(false)}
        />
      )}

      {choixBloc && (
        <ChoixBloc
          ancre={{ x: choixBloc.x, y: choixBloc.y }}
          onChoisir={(type) => {
            const noeud = creerNoeud(type);
            appliquer((a) => inserer(a, choixBloc.colonne, noeud));
            selectionner(noeud.id);
            setChoixBloc(null);
          }}
          onFermer={() => setChoixBloc(null)}
        />
      )}
    </div>
  );
}

/** La seule porte pour ajouter une section.
 *
 *  Elle ne présente plus les découpages : c'est la fenêtre qui le fait, à côté
 *  des sections toutes faites. Étaler six vignettes sous le canevas obligeait à
 *  choisir un découpage avant de savoir qu'un modèle existait. */
function AjoutSection({ onOuvrir }: { onOuvrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onOuvrir}
      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-outline-soft bg-surface-container-lowest py-3 text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
    >
      <AddOutlined style={{ fontSize: 18 }} />
      Ajouter une section
    </button>
  );
}

export function noeudExiste(arbre: Noeud, id: string | null): boolean {
  return Boolean(id && trouver(arbre, id));
}

export { urlMediaEditeur };
