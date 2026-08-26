import type { CSSProperties } from "react";

import type { DefinitionWidget, Lien, RefMedia } from "../types";
import { nombre, texte, versDimension } from "../theme";

export const IMAGE: DefinitionWidget = {
  cle: "image",
  libelle: "Image",
  icone: "image",
  categorie: "media",
  defauts: {
    largeur: { valeur: 100, unite: "%" },
    rayon: 0,
    alignement: "left",
    chargement: "lazy",
  },
  schema: [
    { cle: "media", libelle: "Image", type: "media", groupe: "contenu" },
    {
      cle: "alt",
      libelle: "Texte alternatif",
      type: "texte",
      groupe: "contenu",
      aide: "Lu par les lecteurs d'écran et affiché si l'image ne charge pas.",
    },
    { cle: "lien", libelle: "Lien", type: "lien", groupe: "contenu" },
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
    },
    { cle: "rayon", libelle: "Coins arrondis", type: "nombre", groupe: "style", unite: "px", min: 0, max: 64 },
    {
      cle: "alignement",
      libelle: "Alignement",
      type: "alignement",
      groupe: "style",
      options: [
        { valeur: "left", libelle: "Gauche" },
        { valeur: "center", libelle: "Centre" },
        { valeur: "right", libelle: "Droite" },
      ],
      reactif: true,
    },
    { cle: "ratio", libelle: "Format imposé", type: "choix", groupe: "style", options: [
      { valeur: "", libelle: "Naturel" },
      { valeur: "1/1", libelle: "Carré" },
      { valeur: "4/3", libelle: "4:3" },
      { valeur: "16/9", libelle: "16:9" },
      { valeur: "3/4", libelle: "Portrait 3:4" },
    ] },
    {
      cle: "chargement",
      libelle: "Chargement",
      type: "choix",
      groupe: "avance",
      options: [
        { valeur: "lazy", libelle: "Différé" },
        { valeur: "eager", libelle: "Immédiat" },
      ],
      aide: "Immédiat seulement pour l'image visible d'emblée en haut de page.",
    },
  ],
  style: (props) => ({
    textAlign: texte(props.alignement, "left") as CSSProperties["textAlign"],
    width: "100%",
  }),
  Rendu: ({ props, contexte, style, attributs }) => {
    const media = props.media as RefMedia | undefined;
    const largeur = versDimension(props.largeur ?? props.largeur_pct, {
      valeur: 100,
      unite: "%",
    });
    const ratio = texte(props.ratio);

    const image: CSSProperties = {
      width: largeur,
      maxWidth: "100%",
      height: ratio ? "auto" : undefined,
      aspectRatio: ratio || undefined,
      objectFit: ratio ? "cover" : undefined,
      borderRadius: nombre(props.rayon, 0),
      verticalAlign: "middle",
    };

    if (!media?.jeton) {
      // Un emplacement visible plutôt qu'un trou : dans le canevas, une image
      // non choisie doit rester sélectionnable et se signaler.
      return (
        <div {...attributs} style={style}>
          <div
            style={{
              ...image,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 160,
              background: "#f1f5f9",
              border: "1px dashed #cbd5e1",
              color: "#64748b",
              fontSize: 14,
              fontFamily: "var(--site-police-texte)",
            }}
          >
            Aucune image choisie
          </div>
        </div>
      );
    }

    const balise = (
      <img
        src={contexte.urlMedia?.(media.jeton) ?? ""}
        alt={texte(props.alt, media.alt ?? "")}
        width={media.largeur ?? undefined}
        height={media.hauteur ?? undefined}
        loading={texte(props.chargement, "lazy") === "eager" ? "eager" : "lazy"}
        decoding="async"
        style={image}
      />
    );

    const href = contexte.resoudreLien?.(props.lien as Lien | undefined);
    return (
      <div {...attributs} style={style}>
        {href && !contexte.edition ? <a href={href}>{balise}</a> : balise}
      </div>
    );
  },
};
