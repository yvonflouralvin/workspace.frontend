import { creerNoeud, creerSectionDisposition } from "./catalogue";
import type { Noeud } from "./types";

/** Des sections toutes faites — « héros », « tarifs », « équipe ».
 *
 *  **Ce ne sont pas des composants**, mais des ARBRES fabriqués à la demande :
 *  une fois posé, un modèle n'existe plus, il n'y a plus que des sections et
 *  des widgets ordinaires. Un modèle qui resterait vivant obligerait à décider
 *  ce qui se passe quand on en modifie un morceau — et à écrire un moteur de
 *  surcharge que personne n'a demandé.
 *
 *  Ils existent pour une raison simple : une page vide est le pire écran d'un
 *  constructeur. Empiler soi-même une section, deux colonnes, un titre, un
 *  texte et un bouton pour obtenir un bandeau d'accueil, c'est cinq gestes
 *  avant de commencer à écrire.
 *
 *  La CATÉGORIE sert uniquement au tiroir de choix (regrouper, filtrer) — elle
 *  ne survit pas à la pose, comme le reste.
 */

export const CATEGORIES_MODELES: { cle: string; libelle: string }[] = [
  { cle: "heros", libelle: "Bandeaux d'accueil" },
  { cle: "apropos", libelle: "À propos" },
  { cle: "fonctionnalites", libelle: "Fonctionnalités" },
  { cle: "chiffres", libelle: "Chiffres & confiance" },
  { cle: "temoignages", libelle: "Témoignages" },
  { cle: "tarifs", libelle: "Tarifs" },
  { cle: "equipe", libelle: "Équipe" },
  { cle: "galerie", libelle: "Galerie & réalisations" },
  { cle: "faq", libelle: "Questions fréquentes" },
  { cle: "contact", libelle: "Contact & newsletter" },
  { cle: "appel", libelle: "Appel à l'action" },
];

/** Ce qu'un aperçu peut empiler dans une colonne — assez pour reconnaître un
 *  modèle d'un coup d'œil, pas plus : ce n'est pas un second moteur de rendu. */
export type BlocApercu = "titre" | "texte" | "bouton" | "image" | "icones";

export interface ApercuModele {
  colonnes: { largeur: number; blocs: BlocApercu[] }[];
  /** Fond sombre — pour reconnaître un héros ou un CTA sombre sans lire le
   *  libellé, comme le ferait une vraie vignette. */
  sombre?: boolean;
}

export interface ModeleSection {
  cle: string;
  libelle: string;
  description: string;
  categorie: string;
  apercu: ApercuModele;
  construire: () => Noeud;
}

function texte(contenu: string) {
  // Le format de BlockNote, réduit à ce qu'un modèle a besoin de produire.
  return [{ type: "paragraph", content: [{ type: "text", text: contenu }] }];
}

function poser(noeud: Noeud, props: Record<string, unknown>): Noeud {
  return { ...noeud, props: { ...noeud.props, ...props } };
}

function titre(contenu: string, niveau = "h2", alignement = "left") {
  return poser(creerNoeud("titre"), { texte: contenu, niveau, alignement });
}

function paragraphe(contenu: string, alignement = "left") {
  return poser(creerNoeud("texte_riche"), { contenu: texte(contenu), alignement });
}

function bouton(libelle: string, alignement = "left") {
  return poser(creerNoeud("bouton"), { libelle, alignement });
}

function image() {
  return creerNoeud("image");
}

function espaceur(hauteur: number) {
  return poser(creerNoeud("espaceur"), { hauteur });
}

interface ElementIcone {
  icone: string;
  texte: string;
}

function listeIcones(elements: ElementIcone[], disposition: "verticale" | "horizontale" = "verticale") {
  return poser(creerNoeud("liste_icones"), { elements, disposition });
}

/** Remplit les colonnes d'une section, dans l'ordre. */
function garnir(section: Noeud, contenus: Noeud[][]): Noeud {
  return {
    ...section,
    enfants: (section.enfants ?? []).map((colonne, i) => ({
      ...colonne,
      enfants: contenus[i] ?? [],
    })),
  };
}

/** Une section 1 colonne, avec ses marges par défaut — le socle de la moitié
 *  des modèles ci-dessous. */
function bande(espacementVertical = 64, props: Record<string, unknown> = {}) {
  return poser(creerSectionDisposition("1"), {
    espacement: { haut: espacementVertical, droite: 24, bas: espacementVertical, gauche: 24 },
    ...props,
  });
}

function colonnes(cle: string, espacementVertical = 56, props: Record<string, unknown> = {}) {
  return poser(creerSectionDisposition(cle), {
    espacement: { haut: espacementVertical, droite: 24, bas: espacementVertical, gauche: 24 },
    ...props,
  });
}

const FOND_SOMBRE = "#0f172a";
const BLANC = "#ffffff";

export const MODELES: ModeleSection[] = [
  // ── Bandeaux d'accueil ──────────────────────────────────────────────────
  {
    cle: "heros",
    libelle: "Bandeau d'accueil",
    description: "Un titre fort, une phrase, un bouton — et une image à droite.",
    categorie: "heros",
    apercu: {
      colonnes: [
        { largeur: 55, blocs: ["titre", "texte", "bouton"] },
        { largeur: 45, blocs: ["image"] },
      ],
    },
    construire: () =>
      garnir(colonnes("1-1", 72), [
        [
          titre("Le titre qui dit ce que vous faites", "h1"),
          paragraphe("Une phrase pour expliquer à qui vous vous adressez et pourquoi cela compte."),
          espaceur(12),
          bouton("Nous contacter"),
        ],
        [image()],
      ]),
  },
  {
    cle: "heros_centre",
    libelle: "Héros centré",
    description: "Titre, phrase et bouton centrés, sans image — pour aller droit au but.",
    categorie: "heros",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte", "bouton"] }] },
    construire: () =>
      garnir(bande(88), [
        [
          titre("Le titre qui dit ce que vous faites", "h1", "center"),
          paragraphe(
            "Une phrase pour expliquer à qui vous vous adressez et pourquoi cela compte.",
            "center",
          ),
          espaceur(16),
          bouton("Commencer", "center"),
        ],
      ]),
  },
  {
    cle: "heros_sombre",
    libelle: "Héros sur fond sombre",
    description: "Bandeau plein écran, fond foncé, texte clair — pour marquer l'entrée du site.",
    categorie: "heros",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte", "bouton"] }], sombre: true },
    construire: () =>
      garnir(bande(96, { fond: FOND_SOMBRE, hauteur_min: { valeur: 60, unite: "vh" }, alignement_vertical: "centre" }), [
        [
          poser(titre("Le titre qui dit ce que vous faites", "h1", "center"), { couleur: BLANC }),
          poser(paragraphe("Une phrase pour expliquer à qui vous vous adressez et pourquoi cela compte.", "center"), {
            couleur: "#cbd5e1",
          }),
          espaceur(16),
          bouton("Commencer", "center"),
        ],
      ]),
  },
  {
    cle: "heros_atouts",
    libelle: "Héros avec arguments",
    description: "Une image, et à côté un titre suivi de trois arguments courts.",
    categorie: "heros",
    apercu: {
      colonnes: [
        { largeur: 45, blocs: ["image"] },
        { largeur: 55, blocs: ["titre", "icones", "bouton"] },
      ],
    },
    construire: () =>
      garnir(colonnes("1-1", 72), [
        [image()],
        [
          titre("Le titre qui dit ce que vous faites", "h1"),
          espaceur(8),
          listeIcones([
            { icone: "check_circle", texte: "Premier argument qui compte" },
            { icone: "check_circle", texte: "Deuxième argument qui compte" },
            { icone: "check_circle", texte: "Troisième argument qui compte" },
          ]),
          espaceur(12),
          bouton("Nous contacter"),
        ],
      ]),
  },
  {
    cle: "bandeau_page",
    libelle: "Bandeau de page",
    description: "Un titre et un sous-titre courts, pour l'en-tête d'une page intérieure.",
    categorie: "heros",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte"] }] },
    construire: () =>
      garnir(bande(48), [
        [titre("Nom de la page", "h1", "center"), paragraphe("Une phrase pour la situer.", "center")],
      ]),
  },

  // ── À propos ──────────────────────────────────────────────────────────
  {
    cle: "texte_image",
    libelle: "Texte et image",
    description: "Une image à gauche, un bloc de texte à droite.",
    categorie: "apropos",
    apercu: {
      colonnes: [
        { largeur: 45, blocs: ["image"] },
        { largeur: 55, blocs: ["titre", "texte"] },
      ],
    },
    construire: () =>
      garnir(colonnes("1-1", 48), [
        [image()],
        [
          titre("Ce que vous voulez raconter", "h2"),
          paragraphe("Deux ou trois phrases suffisent. Le reste se lit sur une autre page."),
        ],
      ]),
  },
  {
    cle: "image_texte_inverse",
    libelle: "Texte et image (inversé)",
    description: "Le même duo, texte à gauche cette fois — pour alterner d'une section à l'autre.",
    categorie: "apropos",
    apercu: {
      colonnes: [
        { largeur: 55, blocs: ["titre", "texte"] },
        { largeur: 45, blocs: ["image"] },
      ],
    },
    construire: () =>
      garnir(colonnes("1-1", 48), [
        [
          titre("Ce que vous voulez raconter", "h2"),
          paragraphe("Deux ou trois phrases suffisent. Le reste se lit sur une autre page."),
        ],
        [image()],
      ]),
  },
  {
    cle: "apropos_histoire",
    libelle: "Notre histoire",
    description: "Un titre et un texte plus long, centrés, sans image — pour se présenter.",
    categorie: "apropos",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte"] }] },
    construire: () =>
      garnir(bande(64), [
        [
          titre("Notre histoire", "h2", "center"),
          paragraphe(
            "Racontez d'où vous venez, ce qui vous a mené ici, et ce qui vous distingue aujourd'hui. Trois ou quatre phrases suffisent à planter le décor.",
            "center",
          ),
        ],
      ]),
  },

  // ── Fonctionnalités ───────────────────────────────────────────────────
  {
    cle: "trois_atouts",
    libelle: "Trois atouts",
    description: "Trois colonnes égales : un titre court et une explication.",
    categorie: "fonctionnalites",
    apercu: {
      colonnes: [
        { largeur: 33, blocs: ["titre", "texte"] },
        { largeur: 33, blocs: ["titre", "texte"] },
        { largeur: 34, blocs: ["titre", "texte"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1-1"),
        [1, 2, 3].map((n) => [titre(`${["Premier", "Deuxième", "Troisième"][n - 1]} atout`, "h3"), paragraphe("Ce qu'il apporte, en une phrase.")]),
      ),
  },
  {
    cle: "fonctionnalites_icones",
    libelle: "Trois fonctionnalités avec icônes",
    description: "Une icône, un titre, une explication — répété trois fois.",
    categorie: "fonctionnalites",
    apercu: {
      colonnes: [
        { largeur: 33, blocs: ["icones", "titre", "texte"] },
        { largeur: 33, blocs: ["icones", "titre", "texte"] },
        { largeur: 34, blocs: ["icones", "titre", "texte"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1-1"),
        [
          { icone: "bolt", nom: "Rapide" },
          { icone: "security", nom: "Fiable" },
          { icone: "support_agent", nom: "Accompagné" },
        ].map((a) => [
          listeIcones([{ icone: a.icone, texte: "" }]),
          titre(a.nom, "h3"),
          paragraphe("Ce qu'il apporte, en une phrase."),
        ]),
      ),
  },
  {
    cle: "fonctionnalites_quatre",
    libelle: "Quatre fonctionnalités",
    description: "La même idée sur quatre colonnes plus étroites.",
    categorie: "fonctionnalites",
    apercu: {
      colonnes: Array.from({ length: 4 }, () => ({ largeur: 25, blocs: ["titre", "texte"] as BlocApercu[] })),
    },
    construire: () =>
      garnir(
        colonnes("1-1-1-1"),
        ["Premier", "Deuxième", "Troisième", "Quatrième"].map((n) => [
          titre(`${n} atout`, "h4"),
          paragraphe("Ce qu'il apporte, en une phrase."),
        ]),
      ),
  },

  // ── Chiffres & confiance ──────────────────────────────────────────────
  {
    cle: "chiffres_cles",
    libelle: "Chiffres clés",
    description: "Quatre nombres imposants, chacun avec sa légende.",
    categorie: "chiffres",
    apercu: {
      colonnes: Array.from({ length: 4 }, () => ({ largeur: 25, blocs: ["titre", "texte"] as BlocApercu[] })),
    },
    construire: () =>
      garnir(
        colonnes("1-1-1-1", 56),
        [
          ["10 ans", "d'expérience"],
          ["500+", "clients accompagnés"],
          ["98 %", "de satisfaction"],
          ["24/7", "de support"],
        ].map(([chiffre, legende]) => [titre(chiffre!, "h2", "center"), paragraphe(legende!, "center")]),
      ),
  },
  {
    cle: "confiance_logos",
    libelle: "Ils nous font confiance",
    description: "Une rangée de logos clients, sobre, sans autre texte.",
    categorie: "chiffres",
    apercu: {
      colonnes: Array.from({ length: 4 }, () => ({ largeur: 25, blocs: ["image"] as BlocApercu[] })),
    },
    construire: () =>
      garnir(
        poser(colonnes("1-1-1-1", 40), { alignement_vertical: "centre" }),
        Array.from({ length: 4 }, () => [image()]),
      ),
  },

  // ── Témoignages ───────────────────────────────────────────────────────
  {
    cle: "citation",
    libelle: "Grande citation",
    description: "Une phrase mise en avant, seule, centrée — pour souligner un mot fort.",
    categorie: "temoignages",
    apercu: { colonnes: [{ largeur: 100, blocs: ["texte"] }] },
    construire: () =>
      garnir(bande(64), [
        [poser(paragraphe("« Une citation qui résume ce qui vous distingue. »", "center"), { taille: 24 })],
      ]),
  },
  {
    cle: "temoignage_seul",
    libelle: "Un avis client",
    description: "Une citation, un nom et une fonction — un seul témoignage mis en valeur.",
    categorie: "temoignages",
    apercu: { colonnes: [{ largeur: 100, blocs: ["texte", "titre", "texte"] }] },
    construire: () =>
      garnir(bande(64), [
        [
          poser(paragraphe("« Ce que ce client a pensé de vous, dans ses mots. »", "center"), { taille: 20 }),
          espaceur(8),
          titre("Prénom Nom", "h4", "center"),
          paragraphe("Fonction, entreprise", "center"),
        ],
      ]),
  },
  {
    cle: "temoignages_trois",
    libelle: "Trois avis clients",
    description: "Trois citations côte à côte, chacune avec son nom.",
    categorie: "temoignages",
    apercu: {
      colonnes: [
        { largeur: 33, blocs: ["texte", "titre"] },
        { largeur: 33, blocs: ["texte", "titre"] },
        { largeur: 34, blocs: ["texte", "titre"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1-1"),
        Array.from({ length: 3 }, () => [
          paragraphe("« Ce que ce client a pensé de vous, dans ses mots. »"),
          espaceur(8),
          titre("Prénom Nom", "h4"),
          paragraphe("Fonction, entreprise"),
        ]),
      ),
  },

  // ── Tarifs ────────────────────────────────────────────────────────────
  {
    cle: "tarifs",
    libelle: "Tarifs (trois formules)",
    description: "Trois formules côte à côte, chacune avec sa liste et son bouton.",
    categorie: "tarifs",
    apercu: {
      colonnes: [
        { largeur: 33, blocs: ["titre", "titre", "icones", "bouton"] },
        { largeur: 33, blocs: ["titre", "titre", "icones", "bouton"] },
        { largeur: 34, blocs: ["titre", "titre", "icones", "bouton"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1-1"),
        ["Essentiel", "Courant", "Complet"].map((nom) => [
          titre(nom, "h3", "center"),
          titre("0 $", "h2", "center"),
          listeIcones([
            { icone: "check_circle", texte: "Ce qui est compris" },
            { icone: "check_circle", texte: "Ce qui est compris aussi" },
            { icone: "check_circle", texte: "Et encore ceci" },
          ]),
          bouton("Choisir", "center"),
        ]),
      ),
  },
  {
    cle: "tarifs_deux",
    libelle: "Tarifs (deux formules)",
    description: "Deux formules, plus larges — quand il n'y a que deux choix à présenter.",
    categorie: "tarifs",
    apercu: {
      colonnes: [
        { largeur: 50, blocs: ["titre", "titre", "icones", "bouton"] },
        { largeur: 50, blocs: ["titre", "titre", "icones", "bouton"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1"),
        ["Standard", "Premium"].map((nom) => [
          titre(nom, "h3", "center"),
          titre("0 $", "h2", "center"),
          listeIcones([
            { icone: "check_circle", texte: "Ce qui est compris" },
            { icone: "check_circle", texte: "Ce qui est compris aussi" },
            { icone: "check_circle", texte: "Et encore ceci" },
          ]),
          bouton("Choisir", "center"),
        ]),
      ),
  },

  // ── Équipe ────────────────────────────────────────────────────────────
  {
    cle: "equipe",
    libelle: "Équipe (quatre portraits)",
    description: "Quatre portraits avec un nom et un rôle.",
    categorie: "equipe",
    apercu: {
      colonnes: Array.from({ length: 4 }, () => ({ largeur: 25, blocs: ["image", "titre", "texte"] as BlocApercu[] })),
    },
    construire: () =>
      garnir(
        colonnes("1-1-1-1"),
        Array.from({ length: 4 }, () => [image(), titre("Prénom Nom", "h4", "center"), paragraphe("Fonction", "center")]),
      ),
  },
  {
    cle: "equipe_duo",
    libelle: "Deux portraits",
    description: "Deux portraits plus grands — pour présenter les fondateurs.",
    categorie: "equipe",
    apercu: {
      colonnes: [
        { largeur: 50, blocs: ["image", "titre", "texte"] },
        { largeur: 50, blocs: ["image", "titre", "texte"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1"),
        Array.from({ length: 2 }, () => [image(), titre("Prénom Nom", "h3", "center"), paragraphe("Fonction", "center")]),
      ),
  },

  // ── Galerie & réalisations ────────────────────────────────────────────
  {
    cle: "galerie_grille",
    libelle: "Galerie photo",
    description: "Une grille de quatre images, sans texte — pour montrer plutôt que dire.",
    categorie: "galerie",
    apercu: {
      colonnes: Array.from({ length: 4 }, () => ({ largeur: 25, blocs: ["image"] as BlocApercu[] })),
    },
    construire: () => garnir(colonnes("1-1-1-1", 24), Array.from({ length: 4 }, () => [image()])),
  },
  {
    cle: "portfolio_projets",
    libelle: "Nos réalisations",
    description: "Trois projets : une image, un titre et une courte description chacun.",
    categorie: "galerie",
    apercu: {
      colonnes: [
        { largeur: 33, blocs: ["image", "titre", "texte"] },
        { largeur: 33, blocs: ["image", "titre", "texte"] },
        { largeur: 34, blocs: ["image", "titre", "texte"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1-1"),
        Array.from({ length: 3 }, () => [image(), titre("Nom du projet", "h4"), paragraphe("Une phrase pour le situer.")]),
      ),
  },

  // ── Questions fréquentes ──────────────────────────────────────────────
  {
    cle: "faq_liste",
    libelle: "Questions fréquentes",
    description: "Quatre questions et leurs réponses, l'une sous l'autre.",
    categorie: "faq",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte", "titre", "texte"] }] },
    construire: () =>
      garnir(bande(56), [
        Array.from({ length: 4 }).flatMap(() => [
          titre("Une question fréquente ?", "h4"),
          paragraphe("La réponse, en deux ou trois phrases."),
          espaceur(8),
        ]),
      ]),
  },
  {
    cle: "faq_deux_colonnes",
    libelle: "FAQ en deux colonnes",
    description: "Les mêmes questions, réparties sur deux colonnes pour aller plus vite à lire.",
    categorie: "faq",
    apercu: {
      colonnes: [
        { largeur: 50, blocs: ["titre", "texte", "titre", "texte"] },
        { largeur: 50, blocs: ["titre", "texte", "titre", "texte"] },
      ],
    },
    construire: () =>
      garnir(
        colonnes("1-1"),
        [0, 1].map(() =>
          Array.from({ length: 2 }).flatMap(() => [
            titre("Une question fréquente ?", "h4"),
            paragraphe("La réponse, en deux ou trois phrases."),
            espaceur(8),
          ]),
        ),
      ),
  },

  // ── Contact & newsletter ──────────────────────────────────────────────
  {
    cle: "contact_coordonnees",
    libelle: "Nous contacter",
    description: "Vos coordonnées à gauche, un bouton d'action à droite.",
    categorie: "contact",
    apercu: {
      colonnes: [
        { largeur: 50, blocs: ["titre", "icones"] },
        { largeur: 50, blocs: ["texte", "bouton"] },
      ],
    },
    construire: () =>
      garnir(colonnes("1-1", 56), [
        [
          titre("Nous contacter", "h2"),
          listeIcones([
            { icone: "call", texte: "+1 000 000 0000" },
            { icone: "email", texte: "contact@votresite.com" },
            { icone: "location_on", texte: "Votre adresse" },
          ]),
        ],
        [
          paragraphe("Une question, un projet ? Écrivez-nous, nous répondons sous 24 heures."),
          espaceur(12),
          bouton("Nous écrire"),
        ],
      ]),
  },
  {
    cle: "newsletter",
    libelle: "Newsletter",
    description: "Une bande centrée pour recueillir une adresse e-mail.",
    categorie: "contact",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte", "bouton"] }] },
    construire: () =>
      garnir(bande(56, { fond: "#eff4ff" }), [
        [
          titre("Restez informé", "h2", "center"),
          paragraphe("Une actualité par mois, jamais plus.", "center"),
          espaceur(12),
          creerNoeud("abonnement"),
        ],
      ]),
  },

  // ── Appel à l'action ──────────────────────────────────────────────────
  {
    cle: "appel",
    libelle: "Appel à l'action",
    description: "Une bande centrée : une phrase, un bouton.",
    categorie: "appel",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte", "bouton"] }], sombre: true },
    construire: () =>
      garnir(bande(64, { fond: FOND_SOMBRE }), [
        [
          poser(titre("Prêt à commencer ?", "h2", "center"), { couleur: BLANC }),
          poser(paragraphe("Une phrase qui lève la dernière hésitation.", "center"), { couleur: "#cbd5e1" }),
          espaceur(12),
          bouton("Commencer", "center"),
        ],
      ]),
  },
  {
    cle: "cta_reassurance",
    libelle: "Appel à l'action avec réassurance",
    description: "La même bande, complétée par une ligne de garanties.",
    categorie: "appel",
    apercu: { colonnes: [{ largeur: 100, blocs: ["titre", "texte", "bouton", "icones"] }], sombre: true },
    construire: () =>
      garnir(bande(64, { fond: FOND_SOMBRE }), [
        [
          poser(titre("Prêt à commencer ?", "h2", "center"), { couleur: BLANC }),
          poser(paragraphe("Une phrase qui lève la dernière hésitation.", "center"), { couleur: "#cbd5e1" }),
          espaceur(16),
          bouton("Commencer", "center"),
          espaceur(20),
          poser(
            listeIcones(
              [
                { icone: "verified", texte: "Sans engagement" },
                { icone: "support_agent", texte: "Support 7j/7" },
              ],
              "horizontale",
            ),
            { couleur_icone: BLANC },
          ),
        ],
      ]),
  },
];

/** L'en-tête par défaut : le nom du site à gauche, un bouton à droite. */
export function entetePardefaut(nomDuSite: string): Noeud {
  return garnir(colonnes("2-1", 20), [[titre(nomDuSite, "h3")], [bouton("Nous contacter", "right")]]);
}

/** Le pied par défaut : une mention, discrète. */
export function piedParDefaut(nomDuSite: string): Noeud {
  const annee = "2026";
  return garnir(bande(32, { fond: FOND_SOMBRE }), [
    [paragraphe(`© ${annee} ${nomDuSite}. Tous droits réservés.`, "center")],
  ]);
}
