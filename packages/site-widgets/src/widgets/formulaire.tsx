/** Le bloc d'abonnement : la définition, séparée de la vue.
 *
 *  **La définition ne porte PAS `"use client"`, et c'est structurel.** Un module
 *  marqué client voit TOUS ses exports devenir des références client quand un
 *  composant serveur l'importe — y compris un simple objet. La définition
 *  perdait alors son `schema`, ses `defauts`, son `style` et son drapeau
 *  `interactif` : le widget se rendait sans mise en forme, et le contexte
 *  complet lui était passé, ce qui faisait tomber la page entière en erreur
 *  serveur.
 *
 *  Seule la VUE vit dans le navigateur, dans son propre module.
 */
import type { CSSProperties } from "react";

import type { DefinitionWidget } from "../types";
import { texte, valeurDimension, versDimension, versPadding } from "../theme";
import { AbonnementVue } from "./AbonnementVue";

export const ABONNEMENT: DefinitionWidget = {
  cle: "abonnement",
  // Il a de l'état et poste au serveur : c'est un composant client, et le
  // rendu doit lui passer un contexte sans fonctions.
  interactif: true,
  libelle: "Abonnement",
  icone: "mark_email_read",
  categorie: "interaction",
  description: "Un champ email et un bouton. Les adresses arrivent dans « Ventes › Abonnés ».",
  defauts: {
    titre: "Restons en contact",
    intro: "Recevez nos nouveautés. Une adresse suffit, et on n'en fait rien d'autre.",
    invite: "Votre adresse email",
    bouton: "Je m'abonne",
    merci: "Merci — vous êtes inscrit.",
    source: "",
    alignement: "left",
    espacement: { haut: 0, droite: 0, bas: 0, gauche: 0 },
  },
  schema: [
    { cle: "titre", libelle: "Titre", type: "texte", groupe: "contenu" },
    { cle: "intro", libelle: "Phrase d'introduction", type: "texte", groupe: "contenu" },
    { cle: "invite", libelle: "Texte du champ", type: "texte", groupe: "contenu" },
    { cle: "bouton", libelle: "Texte du bouton", type: "texte", groupe: "contenu" },
    { cle: "merci", libelle: "Message de remerciement", type: "texte", groupe: "contenu" },
    {
      cle: "source",
      libelle: "Étiquette de provenance",
      type: "texte",
      groupe: "avance",
      aide: "Pour savoir quel bloc convertit. Apparaît dans la liste des abonnés.",
    },
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
    { cle: "espacement", libelle: "Marges intérieures", type: "espacement", groupe: "style", reactif: true },
    {
      cle: "largeur_max",
      libelle: "Largeur maximale",
      type: "dimension",
      groupe: "style",
      unites: ["px", "%", "em", "rem"],
      min: 0,
      max: 900,
      reactif: true,
    },
  ],
  style: (props) => {
    const style: CSSProperties = {
      textAlign: texte(props.alignement, "left") as CSSProperties["textAlign"],
      padding: versPadding(props.espacement),
    };
    if (valeurDimension(props.largeur_max, 0) > 0) {
      style.maxWidth = versDimension(props.largeur_max, { valeur: 0, unite: "px" });
    }
    return style;
  },
  Rendu: AbonnementVue,
};
