import type { CSSProperties } from "react";

import { RichText } from "../RichText";
import type { DefinitionWidget, Lien } from "../types";
import { booleen, nombre, texte, versDimension } from "../theme";

const ALIGNEMENTS = [
  { valeur: "left", libelle: "Gauche" },
  { valeur: "center", libelle: "Centre" },
  { valeur: "right", libelle: "Droite" },
  { valeur: "justify", libelle: "Justifié" },
];

const NIVEAUX = [
  { valeur: "h1", libelle: "Titre 1" },
  { valeur: "h2", libelle: "Titre 2" },
  { valeur: "h3", libelle: "Titre 3" },
  { valeur: "h4", libelle: "Titre 4" },
  { valeur: "h5", libelle: "Titre 5" },
  { valeur: "h6", libelle: "Titre 6" },
];

const TAILLES_PAR_NIVEAU: Record<string, number> = {
  h1: 44,
  h2: 34,
  h3: 26,
  h4: 21,
  h5: 18,
  h6: 16,
};

export const TITRE: DefinitionWidget = {
  cle: "titre",
  libelle: "Titre",
  icone: "title",
  categorie: "base",
  defauts: { texte: "Votre titre ici", niveau: "h2", alignement: "left", graisse: 700 },
  schema: [
    { cle: "texte", libelle: "Texte", type: "texte_long", groupe: "contenu" },
    { cle: "niveau", libelle: "Niveau", type: "choix", groupe: "contenu", options: NIVEAUX, aide: "Compte pour le référencement : un seul Titre 1 par page." },
    { cle: "lien", libelle: "Lien", type: "lien", groupe: "contenu" },
    { cle: "alignement", libelle: "Alignement", type: "alignement", groupe: "style", options: ALIGNEMENTS, reactif: true },
    { cle: "couleur", libelle: "Couleur", type: "couleur", groupe: "style" },
    {
      cle: "taille",
      libelle: "Taille",
      type: "dimension",
      groupe: "style",
      unites: ["px", "em", "rem", "%"],
      min: 0,
      max: 96,
      reactif: true,
    },
    { cle: "graisse", libelle: "Graisse", type: "choix", groupe: "style", options: [
      { valeur: "400", libelle: "Normale" },
      { valeur: "600", libelle: "Semi-grasse" },
      { valeur: "700", libelle: "Grasse" },
      { valeur: "800", libelle: "Très grasse" },
    ] },
    {
      cle: "marge_bas",
      libelle: "Espace en dessous",
      type: "dimension",
      groupe: "style",
      unites: ["px", "em", "rem"],
      min: 0,
      max: 96,
      reactif: true,
    },
  ],
  style: (props) => {
    const niveau = texte(props.niveau, "h2");
    return {
      textAlign: texte(props.alignement, "left") as CSSProperties["textAlign"],
      color: texte(props.couleur) || "var(--site-texte)",
      fontSize: versDimension(props.taille, {
        valeur: TAILLES_PAR_NIVEAU[niveau] ?? 34,
        unite: "px",
      }),
      fontWeight: Number(texte(props.graisse, "700")) || 700,
      fontFamily: "var(--site-police-titre)",
      lineHeight: 1.2,
      margin: `0 0 ${versDimension(props.marge_bas, { valeur: 16, unite: "px" })}`,
    };
  },
  Rendu: ({ props, contexte, style, attributs }) => {
    const Balise = (texte(props.niveau, "h2") || "h2") as "h2";
    const href = contexte.resoudreLien?.(props.lien as Lien | undefined);
    const contenu = texte(props.texte, "Votre titre ici");
    return (
      <Balise {...attributs} style={style}>
        {href && !contexte.edition ? (
          <a href={href} style={{ color: "inherit", textDecoration: "none" }}>
            {contenu}
          </a>
        ) : (
          contenu
        )}
      </Balise>
    );
  },
};

export const TEXTE_RICHE: DefinitionWidget = {
  cle: "texte_riche",
  libelle: "Texte",
  icone: "notes",
  categorie: "base",
  defauts: {
    contenu: [{ type: "paragraph", content: [{ type: "text", text: "Écrivez ici.", styles: {} }] }],
    alignement: "left",
    taille: 16,
  },
  schema: [
    { cle: "contenu", libelle: "Contenu", type: "texte_riche", groupe: "contenu" },
    { cle: "alignement", libelle: "Alignement", type: "alignement", groupe: "style", options: ALIGNEMENTS, reactif: true },
    { cle: "couleur", libelle: "Couleur", type: "couleur", groupe: "style" },
    {
      cle: "taille",
      libelle: "Taille",
      type: "dimension",
      groupe: "style",
      unites: ["px", "em", "rem", "%"],
      min: 0,
      max: 40,
      reactif: true,
    },
    { cle: "interligne", libelle: "Interligne", type: "nombre", groupe: "style", min: 1, max: 3, pas: 0.1 },
  ],
  style: (props) => ({
    textAlign: texte(props.alignement, "left") as CSSProperties["textAlign"],
    color: texte(props.couleur) || "var(--site-texte)",
    fontSize: versDimension(props.taille, { valeur: 16, unite: "px" }),
    lineHeight: nombre(props.interligne, 1.7),
    fontFamily: "var(--site-police-texte)",
  }),
  Rendu: ({ props, style, attributs }) => (
    <div {...attributs} style={style}>
      <RichText blocs={props.contenu} />
    </div>
  ),
};

export const BOUTON: DefinitionWidget = {
  cle: "bouton",
  libelle: "Bouton",
  icone: "smart_button",
  categorie: "base",
  defauts: {
    libelle: "En savoir plus",
    variante: "plein",
    taille: "moyenne",
    alignement: "left",
    pleine_largeur: false,
  },
  schema: [
    { cle: "libelle", libelle: "Texte", type: "texte", groupe: "contenu" },
    { cle: "lien", libelle: "Lien", type: "lien", groupe: "contenu" },
    { cle: "variante", libelle: "Style", type: "choix", groupe: "style", options: [
      { valeur: "plein", libelle: "Plein" },
      { valeur: "contour", libelle: "Contour" },
      { valeur: "texte", libelle: "Texte seul" },
    ] },
    { cle: "taille", libelle: "Taille", type: "choix", groupe: "style", options: [
      { valeur: "petite", libelle: "Petite" },
      { valeur: "moyenne", libelle: "Moyenne" },
      { valeur: "grande", libelle: "Grande" },
    ] },
    { cle: "couleur", libelle: "Couleur", type: "couleur", groupe: "style" },
    { cle: "alignement", libelle: "Alignement", type: "alignement", groupe: "style", options: ALIGNEMENTS.slice(0, 3), reactif: true },
    { cle: "pleine_largeur", libelle: "Pleine largeur", type: "booleen", groupe: "style", reactif: true },
  ],
  style: (props) => ({
    textAlign: texte(props.alignement, "left") as CSSProperties["textAlign"],
    width: "100%",
  }),
  Rendu: ({ props, contexte, style, attributs }) => {
    const variante = texte(props.variante, "plein");
    const taille = texte(props.taille, "moyenne");
    const couleur = texte(props.couleur) || "var(--site-primaire)";
    const paddings: Record<string, string> = {
      petite: "8px 16px",
      moyenne: "12px 24px",
      grande: "16px 34px",
    };
    const tailles: Record<string, number> = { petite: 14, moyenne: 16, grande: 18 };

    const bouton: CSSProperties = {
      display: booleen(props.pleine_largeur) ? "block" : "inline-block",
      width: booleen(props.pleine_largeur) ? "100%" : undefined,
      textAlign: "center",
      padding: paddings[taille] ?? paddings.moyenne,
      fontSize: tailles[taille] ?? 16,
      fontWeight: 600,
      fontFamily: "var(--site-police-texte)",
      borderRadius: "var(--site-rayon)",
      textDecoration: "none",
      cursor: contexte.edition ? "default" : "pointer",
      border: variante === "contour" ? `2px solid ${couleur}` : "2px solid transparent",
      backgroundColor: variante === "plein" ? couleur : "transparent",
      color: variante === "plein" ? "#ffffff" : couleur,
    };

    const href = contexte.resoudreLien?.(props.lien as Lien | undefined);
    const cible = (props.lien as Lien | undefined)?.nouvelOnglet;

    return (
      <div {...attributs} style={style}>
        {contexte.edition || !href ? (
          <span style={bouton}>{texte(props.libelle, "En savoir plus")}</span>
        ) : (
          <a
            href={href}
            style={bouton}
            target={cible ? "_blank" : undefined}
            rel={cible ? "noopener noreferrer" : undefined}
          >
            {texte(props.libelle, "En savoir plus")}
          </a>
        )}
      </div>
    );
  },
};

interface ElementListe {
  icone?: string;
  texte?: string;
  lien?: Lien;
}

export const LISTE_ICONES: DefinitionWidget = {
  cle: "liste_icones",
  libelle: "Liste à icônes",
  icone: "checklist",
  categorie: "base",
  defauts: {
    elements: [
      { icone: "check_circle", texte: "Premier point" },
      { icone: "check_circle", texte: "Deuxième point" },
    ],
    disposition: "verticale",
    couleur_icone: "",
  },
  schema: [
    {
      cle: "elements",
      libelle: "Éléments",
      type: "liste",
      groupe: "contenu",
      cleLibelle: "texte",
      sousSchema: [
        { cle: "icone", libelle: "Icône", type: "icone", groupe: "contenu" },
        { cle: "texte", libelle: "Texte", type: "texte", groupe: "contenu" },
        { cle: "lien", libelle: "Lien", type: "lien", groupe: "contenu" },
      ],
    },
    { cle: "disposition", libelle: "Disposition", type: "choix", groupe: "style", options: [
      { valeur: "verticale", libelle: "En colonne" },
      { valeur: "horizontale", libelle: "En ligne" },
    ], reactif: true },
    { cle: "couleur_icone", libelle: "Couleur des icônes", type: "couleur", groupe: "style" },
    {
      cle: "taille",
      libelle: "Taille du texte",
      type: "dimension",
      groupe: "style",
      unites: ["px", "em", "rem", "%"],
      min: 0,
      max: 28,
      reactif: true,
    },
    {
      cle: "espace",
      libelle: "Espace entre",
      type: "dimension",
      groupe: "style",
      unites: ["px", "em", "rem"],
      min: 0,
      max: 48,
      reactif: true,
    },
  ],
  style: (props) => ({
    display: "flex",
    flexDirection: texte(props.disposition, "verticale") === "horizontale" ? "row" : "column",
    flexWrap: "wrap",
    gap: versDimension(props.espace, { valeur: 12, unite: "px" }),
    fontSize: versDimension(props.taille, { valeur: 16, unite: "px" }),
    fontFamily: "var(--site-police-texte)",
    color: "var(--site-texte)",
  }),
  Rendu: ({ props, contexte, style, attributs }) => {
    const elements = Array.isArray(props.elements) ? (props.elements as ElementListe[]) : [];
    const couleur = texte(props.couleur_icone) || "var(--site-primaire)";
    return (
      <ul {...attributs} style={{ ...style, listStyle: "none", margin: 0, padding: 0 }}>
        {elements.map((element, i) => {
          const href = contexte.resoudreLien?.(element.lien);
          const contenu = (
            <>
              <span
                className="material-symbols-outlined"
                aria-hidden="true"
                style={{ color: couleur, fontSize: "1.25em", lineHeight: 1 }}
              >
                {element.icone || "check_circle"}
              </span>
              <span>{element.texte ?? ""}</span>
            </>
          );
          return (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {href && !contexte.edition ? (
                <a href={href} style={{ display: "contents", color: "inherit", textDecoration: "none" }}>
                  {contenu}
                </a>
              ) : (
                contenu
              )}
            </li>
          );
        })}
      </ul>
    );
  },
};
