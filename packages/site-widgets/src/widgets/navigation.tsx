import type { CSSProperties } from "react";

import type { DefinitionWidget, Lien } from "../types";
import { nombre, texte } from "../theme";

const ALIGNEMENTS = [
  { valeur: "left", libelle: "Gauche" },
  { valeur: "center", libelle: "Centre" },
  { valeur: "right", libelle: "Droite" },
];

interface ElementMenu {
  libelle: string;
  lien?: Lien;
}

/** La navigation d'un en-tête ou d'un pied — ce que ni Titre ni Bouton ne
 *  couvrent : une LISTE de liens, légers, qui s'enchaînent en ligne.
 *
 *  Pas de hamburger caché derrière un état React : sous une largeur qui ne
 *  tient plus la ligne, les liens passent simplement à la ligne suivante
 *  (`flex-wrap`). Un site vitrine à cinq ou six pages n'a jamais besoin de
 *  plus, et ça évite d'ajouter un widget interactif — donc un composant
 *  client — juste pour replier une liste de texte.
 */
export const MENU: DefinitionWidget = {
  cle: "menu",
  libelle: "Menu",
  icone: "menu",
  categorie: "base",
  description: "Une liste de liens vers les pages du site.",
  defauts: {
    elements: [
      { libelle: "Accueil", lien: { page: "/" } },
      { libelle: "À propos", lien: { page: "/a-propos" } },
      { libelle: "Contact", lien: { page: "/contact" } },
    ],
    alignement: "right",
    espacement: 28,
  },
  schema: [
    {
      cle: "elements",
      libelle: "Liens",
      type: "liste",
      groupe: "contenu",
      cleLibelle: "libelle",
      sousSchema: [
        { cle: "libelle", libelle: "Texte", type: "texte", groupe: "contenu" },
        { cle: "lien", libelle: "Lien", type: "lien", groupe: "contenu" },
      ],
    },
    { cle: "alignement", libelle: "Alignement", type: "alignement", groupe: "style", options: ALIGNEMENTS, reactif: true },
    { cle: "espacement", libelle: "Espace entre les liens", type: "nombre", groupe: "style", unite: "px", min: 8, max: 64 },
    { cle: "couleur", libelle: "Couleur", type: "couleur", groupe: "style" },
  ],
  style: (props) => {
    const JUSTIFY: Record<string, CSSProperties["justifyContent"]> = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
    };
    return {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: JUSTIFY[texte(props.alignement, "right")] ?? "flex-end",
    };
  },
  Rendu: ({ props, contexte, style, attributs }) => {
    const elements = (props.elements as ElementMenu[] | undefined) ?? [];
    const espacement = nombre(props.espacement, 28);
    const couleur = texte(props.couleur) || "var(--site-texte)";

    const lienStyle: CSSProperties = {
      color: couleur,
      textDecoration: "none",
      fontFamily: "var(--site-police-texte)",
      fontSize: 15,
      fontWeight: 500,
      whiteSpace: "nowrap",
    };

    if (elements.length === 0) {
      return contexte.edition ? (
        <nav {...attributs} style={style}>
          <span style={{ ...lienStyle, opacity: 0.5 }}>Aucun lien — ajoutez-en dans le panneau.</span>
        </nav>
      ) : null;
    }

    return (
      <nav {...attributs} style={{ ...style, gap: espacement, rowGap: espacement / 2 }}>
        {elements.map((el, i) => {
          const href = contexte.resoudreLien?.(el.lien);
          return contexte.edition || !href ? (
            <span key={i} style={lienStyle}>
              {el.libelle}
            </span>
          ) : (
            <a
              key={i}
              href={href}
              target={el.lien?.nouvelOnglet ? "_blank" : undefined}
              rel={el.lien?.nouvelOnglet ? "noopener noreferrer" : undefined}
              style={lienStyle}
            >
              {el.libelle}
            </a>
          );
        })}
      </nav>
    );
  },
};
