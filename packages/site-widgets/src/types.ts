import type { ComponentType, CSSProperties, ReactNode } from "react";

/** Un nœud de l'arbre d'une page. Section, colonne et widget sont le MÊME
 *  objet avec un `type` différent.
 *
 *  Elementor a longtemps imposé `section > colonne > widget` puis a dû ajouter
 *  les conteneurs flexibles par-dessus, au prix d'une migration douloureuse.
 *  Un nœud uniforme permet d'ajouter un type de conteneur plus tard sans
 *  toucher au stockage. */
export interface Noeud {
  /** Le nom que l'éditeur donne au bloc pour le retrouver dans l'arborescence.
   *
   *  Purement documentaire : il ne sort jamais dans la page publiée. « Bandeau
   *  d'accueil » se retrouve dans un arbre de cent blocs, « Section 7 » non. */
  nom?: string;
  /** Court, aléatoire, stable. Sert de clé React ET de cible de sélection. */
  id: string;
  /** Clé du catalogue. */
  type: string;
  props: Record<string, unknown>;
  /** Surcharges par appareil, seulement pour les réglages qui diffèrent. */
  reactif?: Partial<Record<Appareil, Record<string, unknown>>>;
  enfants?: Noeud[];
}

export type Appareil = "tablette" | "mobile";
export type Cible = "bureau" | Appareil;

export type TypeReglage =
  | "texte"
  | "texte_long"
  | "texte_riche"
  | "nombre"
  | "dimension"
  | "booleen"
  | "couleur"
  | "choix"
  | "choix_multiple"
  | "media"
  | "lien"
  | "icone"
  | "espacement"
  | "alignement"
  | "liste";

export interface OptionReglage {
  valeur: string;
  libelle: string;
}

export interface Reglage {
  cle: string;
  libelle: string;
  aide?: string;
  type: TypeReglage;
  defaut?: unknown;
  options?: OptionReglage[];
  min?: number;
  max?: number;
  pas?: number;
  unite?: string;
  /** Les unités proposées par un réglage `dimension`.
   *
   *  Un nombre nu ne dit pas ce qu'il mesure : 100 en pourcentage remplit la
   *  colonne, 100 en pixels tient dans une vignette. Laisser choisir évite
   *  d'avoir à deviner l'intention derrière une valeur — et évite surtout
   *  d'imposer le pourcentage à des mises en page qui demandent des pixels. */
  unites?: string[];
  /** Sous-schéma d'un réglage `liste`, répétable. */
  sousSchema?: Reglage[];
  /** Étiquette d'un élément de liste dans le panneau, tirée d'une de ses clés. */
  cleLibelle?: string;

  /** Trois onglets, parce qu'ils correspondent aux trois questions qu'on se
   *  pose devant un bloc : qu'est-ce que ça dit, à quoi ça ressemble, et le
   *  reste. */
  groupe: "contenu" | "style" | "avance";

  /** Le réglage peut prendre une valeur différente par appareil. */
  reactif?: boolean;

  /** Affiché seulement si la condition est vraie — la version déclarative des
   *  `Set` qui décident, ailleurs dans le dépôt, quels sous-contrôles
   *  apparaissent. */
  visibleSi?: (props: Record<string, unknown>) => boolean;
}

/** Une référence de média telle que l'inspecteur la produit. On la reconnaît
 *  à sa forme et non au nom de la prop, sinon chaque nouveau widget devrait
 *  s'inscrire quelque part pour que ses images soient comptées. */
export interface RefMedia {
  jeton: string;
  alt?: string;
  largeur?: number | null;
  hauteur?: number | null;
}

export interface Lien {
  href?: string;
  /** Une page interne du site, choisie dans une liste. Prioritaire sur `href`. */
  page?: string;
  nouvelOnglet?: boolean;
}

export interface Theme {
  primaire?: string;
  secondaire?: string;
  fond?: string;
  texte?: string;
  texte_doux?: string;
  police_titre?: string;
  police_texte?: string;
  rayon?: number;
  largeur_contenu?: number;
}

/** Ce qu'un widget reçoit pour se rendre.
 *
 *  **`urlMedia` et `resoudreLien` sont FACULTATIFS**, et c'est structurel : un
 *  widget interactif (`interactif: true`) est un composant client, et une
 *  fonction ne traverse pas la frontière serveur→client — React refuse de
 *  sérialiser, et la page entière tombe en erreur serveur sans désigner le
 *  widget fautif. On lui passe donc un contexte allégé, sans fonctions, avec
 *  les données qui permettent de reconstruire ce dont il a besoin
 *  (`baseMedia`, `prefixeChemin`).
 */
export interface ContexteRendu {
  theme: Theme;
  /** L'appareil que l'on rend. Le canevas de l'éditeur s'en sert pour montrer
   *  le rendu mobile sans changer de page. */
  cible: Cible;
  /** Résout un jeton de média en URL servie. Le builder et le renderer ne
   *  servent pas les médias par le même chemin — d'où l'injection. */
  urlMedia?: (jeton: string) => string;
  /** Résout un lien en href. Dans l'éditeur, il est neutralisé. */
  resoudreLien?: (lien?: Lien) => string | undefined;
  /** La base des URL de médias — de la donnée, sérialisable. */
  baseMedia?: string;
  /** Le préfixe des chemins internes — de la donnée, sérialisable. */
  prefixeChemin?: string;
  /** true dans le canevas de l'éditeur : les widgets y désactivent ce qui
   *  volerait le clic de sélection (navigation, lecture automatique). */
  edition?: boolean;
}

export interface ProprietesRendu {
  props: Record<string, unknown>;
  enfants?: ReactNode;
  contexte: ContexteRendu;
  noeud: Noeud;
  /** Styles de l'élément RACINE du widget, déjà calculés. À poser tels quels.
   *  Ne pas les recalculer dans le composant : ce sont eux que la feuille
   *  réactive surcharge par media query. */
  style: CSSProperties;
  /** À étaler sur l'élément racine. Porte `data-n`, la cible de sélection du
   *  canevas ET l'ancre des règles réactives. */
  attributs: Record<string, string>;
}

export interface DefinitionWidget {
  cle: string;
  libelle: string;
  /** Nom d'icône Material Symbols, rendu par la ligature — pas un composant :
   *  le catalogue doit pouvoir être lu par du code serveur. */
  icone: string;
  categorie: "base" | "media" | "mise_en_page" | "interaction";
  description?: string;
  schema: Reglage[];
  defauts: Record<string, unknown>;
  /** LE MÊME composant sert le canevas de l'éditeur et la page publique.
   *  C'est la raison d'être du package : « ce que je vois est ce qui sera
   *  publié » devient vrai par construction et non par discipline. */
  /** Le composant du widget.
   *
   *  Typé comme un COMPOSANT et non comme une fonction à appeler : il peut
   *  porter `"use client"` et de l'état — le bloc Abonnement en a besoin — et
   *  dans ce cas son export est une référence client, pas une fonction. */
  Rendu: ComponentType<ProprietesRendu>;
  /** Ce widget vit dans le NAVIGATEUR (état, événements, `"use client"`).
   *
   *  Il reçoit alors un contexte allégé, sans fonctions : elles ne franchissent
   *  pas la frontière serveur→client. */
  interactif?: boolean;

  /** Styles de l'élément racine, dérivés des seules props.
   *
   *  Séparé du rendu pour une raison précise : c'est ce qui permet aux
   *  surcharges par appareil de devenir de VRAIES media queries dans la page
   *  publique. Le canevas de l'éditeur connaît l'appareil qu'il simule, mais
   *  le visiteur, lui, redimensionne sa fenêtre — un état React ne répondrait
   *  pas. On recalcule donc cette fonction avec les props surchargées et on
   *  n'émet en CSS que les déclarations qui diffèrent.
   *
   *  Corollaire à connaître : **seul le style de l'élément racine peut être
   *  réactif.** Un réglage marqué `reactif` qui n'atteint pas cette fonction
   *  n'aura aucun effet hors du canevas. */
  style?: (props: Record<string, unknown>, contexte: ContexteRendu) => CSSProperties;

  accepteEnfants?: boolean;
  /** Permission requise pour poser ce widget. Seul `html` en a une. */
  permission?: string;
}
