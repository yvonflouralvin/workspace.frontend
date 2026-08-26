import type { CSSProperties } from "react";

import type { DefinitionWidget, RefMedia } from "../types";
import { nombre, texte, valeurDimension, versDimension, versPadding } from "../theme";

const ALIGNEMENTS_VERTICAUX = [
  { valeur: "haut", libelle: "En haut" },
  { valeur: "centre", libelle: "Au milieu" },
  { valeur: "bas", libelle: "En bas" },
];

const JUSTIFY: Record<string, string> = {
  haut: "flex-start",
  centre: "center",
  bas: "flex-end",
};

export const SECTION: DefinitionWidget = {
  cle: "section",
  libelle: "Section",
  icone: "view_agenda",
  categorie: "mise_en_page",
  description: "Une bande horizontale. Tout le contenu vit dans une section.",
  accepteEnfants: true,
  defauts: {
    fond: "",
    largeur: "contenue",
    espacement: { haut: 64, droite: 24, bas: 64, gauche: 24 },
    alignement_vertical: "haut",
  },
  schema: [
    { cle: "ancre", libelle: "Ancre", type: "texte", groupe: "avance", aide: "Permet un lien du type #tarifs" },
    { cle: "fond", libelle: "Couleur de fond", type: "couleur", groupe: "style" },
    { cle: "fond_image", libelle: "Image de fond", type: "media", groupe: "style" },
    {
      cle: "largeur",
      libelle: "Largeur du contenu",
      type: "choix",
      groupe: "style",
      options: [
        { valeur: "contenue", libelle: "Contenue" },
        { valeur: "pleine", libelle: "Pleine largeur" },
      ],
    },
    { cle: "espacement", libelle: "Marges intérieures", type: "espacement", groupe: "style", reactif: true },
    {
      cle: "hauteur_min",
      libelle: "Hauteur minimale",
      type: "dimension",
      groupe: "style",
      unites: ["px", "vh", "em", "rem", "%"],
      min: 0,
      max: 1200,
      reactif: true,
    },
    {
      cle: "alignement_vertical",
      libelle: "Alignement vertical",
      type: "choix",
      groupe: "style",
      options: ALIGNEMENTS_VERTICAUX,
    },
  ],
  style: (props) => {
    const style: CSSProperties = {
      padding: versPadding(props.espacement),
      display: "flex",
      flexWrap: "wrap",
      alignItems: JUSTIFY[texte(props.alignement_vertical, "haut")] ?? "flex-start",
    };
    const fond = texte(props.fond);
    if (fond) style.backgroundColor = fond;
    if (valeurDimension(props.hauteur_min, 0) > 0) {
      style.minHeight = versDimension(props.hauteur_min, { valeur: 0, unite: "px" });
    }
    return style;
  },
  Rendu: ({ props, enfants, contexte, style, attributs }) => {
    const image = props.fond_image as RefMedia | undefined;
    const contenue = texte(props.largeur, "contenue") === "contenue";
    const fond: CSSProperties = image?.jeton
      ? {
          backgroundImage: `url(${contexte.urlMedia?.(image.jeton) ?? ""})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {};
    const interieur: CSSProperties = contenue
      ? { width: "100%", maxWidth: "var(--site-largeur)", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 0 }
      : { width: "100%", display: "flex", flexWrap: "wrap", gap: 0 };

    return (
      <section {...attributs} style={{ ...style, ...fond, display: "block" }}>
        <div
          style={{
            ...interieur,
            alignItems: style.alignItems,
            minHeight: style.minHeight,
          }}
        >
          {enfants}
        </div>
      </section>
    );
  },
};

export const COLONNE: DefinitionWidget = {
  cle: "colonne",
  libelle: "Colonne",
  icone: "view_column",
  categorie: "mise_en_page",
  accepteEnfants: true,
  defauts: {
    largeur: { valeur: 100, unite: "%" },
    espacement: { haut: 0, droite: 12, bas: 0, gauche: 12 },
    alignement_vertical: "haut",
  },
  schema: [
    {
      cle: "largeur",
      libelle: "Largeur",
      type: "dimension",
      groupe: "style",
      unites: ["%", "px", "em", "rem"],
      min: 0,
      max: 100,
      pas: 5,
      reactif: true,
      aide: "En pourcentage, c'est une part de la section. Sur mobile, 100 % par défaut.",
    },
    { cle: "espacement", libelle: "Marges intérieures", type: "espacement", groupe: "style", reactif: true },
    { cle: "fond", libelle: "Couleur de fond", type: "couleur", groupe: "style" },
    {
      cle: "alignement_vertical",
      libelle: "Alignement vertical",
      type: "choix",
      groupe: "style",
      options: ALIGNEMENTS_VERTICAUX,
    },
  ],
  style: (props) => {
    // `largeur_pct` est l'ancien nom, en pourcentage nu. Les pages déjà
    // publiées le portent : le lire ici évite une migration de documents JSON
    // pour un gain nul.
    const brut = props.largeur ?? props.largeur_pct;
    const largeur = versDimension(brut, { valeur: 100, unite: "%" });
    const style: CSSProperties = {
      flex: `0 0 ${largeur}`,
      maxWidth: largeur,
      padding: versPadding(props.espacement),
      display: "flex",
      flexDirection: "column",
      justifyContent: JUSTIFY[texte(props.alignement_vertical, "haut")] ?? "flex-start",
      minWidth: 0,
    };
    const fond = texte(props.fond);
    if (fond) style.backgroundColor = fond;
    return style;
  },
  Rendu: ({ noeud, enfants, contexte, style, attributs }) => {
    const vide = !noeud?.enfants?.length;
    return (
      <div {...attributs} style={style}>
        {enfants}
        {/* Une colonne vide ne se voit pas — c'est le seul bloc du canevas
            qu'on ne peut ni cliquer ni viser. En édition, elle porte donc sa
            propre porte d'entrée. Le bouton n'ouvre rien lui-même : il pose un
            `data-ajout`, et c'est le canevas qui écoute. Le widget ignore tout
            de l'éditeur — c'est ce qui lui permet de servir aussi la page
            publique, où ce bloc n'existe pas. */}
        {contexte.edition && vide ? (
          <button
            type="button"
            data-ajout={noeud?.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 68,
              width: "100%",
              border: "1px dashed rgba(13,148,136,.45)",
              borderRadius: 10,
              background: "rgba(13,148,136,.04)",
              color: "#0d9488",
              font: "inherit",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            Ajouter un bloc
          </button>
        ) : null}
      </div>
    );
  },
};

export const ESPACEUR: DefinitionWidget = {
  cle: "espaceur",
  libelle: "Espace",
  icone: "height",
  categorie: "mise_en_page",
  defauts: { hauteur: { valeur: 48, unite: "px" } },
  schema: [
    {
      cle: "hauteur",
      libelle: "Hauteur",
      type: "dimension",
      groupe: "style",
      unites: ["px", "em", "rem", "vh"],
      min: 0,
      max: 400,
      reactif: true,
    },
  ],
  style: (props) => ({
    height: versDimension(props.hauteur, { valeur: 48, unite: "px" }),
    width: "100%",
  }),
  Rendu: ({ style, attributs }) => <div {...attributs} style={style} aria-hidden="true" />,
};

export const SEPARATEUR: DefinitionWidget = {
  cle: "separateur",
  libelle: "Séparateur",
  icone: "horizontal_rule",
  categorie: "mise_en_page",
  defauts: {
    style_trait: "solid",
    couleur: "#e5e7eb",
    epaisseur: 1,
    largeur: { valeur: 100, unite: "%" },
    marge: { valeur: 24, unite: "px" },
  },
  schema: [
    {
      cle: "style_trait",
      libelle: "Style",
      type: "choix",
      groupe: "style",
      options: [
        { valeur: "solid", libelle: "Trait plein" },
        { valeur: "dashed", libelle: "Tirets" },
        { valeur: "dotted", libelle: "Pointillés" },
      ],
    },
    { cle: "couleur", libelle: "Couleur", type: "couleur", groupe: "style" },
    { cle: "epaisseur", libelle: "Épaisseur", type: "nombre", groupe: "style", unite: "px", min: 1, max: 12 },
    {
      cle: "largeur",
      libelle: "Largeur",
      type: "dimension",
      groupe: "style",
      unites: ["%", "px", "em", "rem"],
      min: 0,
      max: 100,
      reactif: true,
    },
    {
      cle: "marge",
      libelle: "Espace autour",
      type: "dimension",
      groupe: "style",
      unites: ["px", "em", "rem"],
      min: 0,
      max: 120,
      reactif: true,
    },
  ],
  style: (props) => ({
    width: versDimension(props.largeur ?? props.largeur_pct, { valeur: 100, unite: "%" }),
    borderTopWidth: nombre(props.epaisseur, 1),
    borderTopStyle: texte(props.style_trait, "solid") as CSSProperties["borderTopStyle"],
    borderTopColor: texte(props.couleur, "#e5e7eb"),
    margin: `${versDimension(props.marge, { valeur: 24, unite: "px" })} auto`,
  }),
  Rendu: ({ style, attributs }) => <hr {...attributs} style={style} />,
};
