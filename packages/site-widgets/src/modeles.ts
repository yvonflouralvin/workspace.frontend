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
 */

export interface ModeleSection {
  cle: string;
  libelle: string;
  description: string;
  /** Une esquisse de la forme, en parts de largeur par ligne — de quoi
   *  reconnaître le modèle sans lire son nom. */
  apercu: number[][];
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

export const MODELES: ModeleSection[] = [
  {
    cle: "heros",
    libelle: "Bandeau d'accueil",
    description: "Un titre fort, une phrase, un bouton — et une image à droite.",
    apercu: [[55, 45]],
    construire: () =>
      garnir(
        poser(creerSectionDisposition("1-1"), { espacement: { haut: 72, droite: 24, bas: 72, gauche: 24 } }),
        [
          [
            titre("Le titre qui dit ce que vous faites", "h1"),
            paragraphe(
              "Une phrase pour expliquer à qui vous vous adressez et pourquoi cela compte.",
            ),
            espaceur(12),
            bouton("Nous contacter"),
          ],
          [image()],
        ],
      ),
  },
  {
    cle: "trois_atouts",
    libelle: "Trois atouts",
    description: "Trois colonnes égales : un titre court et une explication.",
    apercu: [[33, 33, 34]],
    construire: () =>
      garnir(
        poser(creerSectionDisposition("1-1-1"), { espacement: { haut: 56, droite: 24, bas: 56, gauche: 24 } }),
        [
          [titre("Premier atout", "h3"), paragraphe("Ce qu'il apporte, en une phrase.")],
          [titre("Deuxième atout", "h3"), paragraphe("Ce qu'il apporte, en une phrase.")],
          [titre("Troisième atout", "h3"), paragraphe("Ce qu'il apporte, en une phrase.")],
        ],
      ),
  },
  {
    cle: "tarifs",
    libelle: "Tarifs",
    description: "Trois formules côte à côte, chacune avec sa liste et son bouton.",
    apercu: [[33, 33, 34]],
    construire: () =>
      garnir(
        poser(creerSectionDisposition("1-1-1"), { espacement: { haut: 56, droite: 24, bas: 56, gauche: 24 } }),
        ["Essentiel", "Courant", "Complet"].map((nom) => [
          titre(nom, "h3", "center"),
          titre("0 $", "h2", "center"),
          poser(creerNoeud("liste_icones"), {
            elements: [
              { icone: "check_circle", texte: "Ce qui est compris" },
              { icone: "check_circle", texte: "Ce qui est compris aussi" },
              { icone: "check_circle", texte: "Et encore ceci" },
            ],
          }),
          bouton("Choisir", "center"),
        ]),
      ),
  },
  {
    cle: "equipe",
    libelle: "Équipe",
    description: "Quatre portraits avec un nom et un rôle.",
    apercu: [[25, 25, 25, 25]],
    construire: () =>
      garnir(
        poser(creerSectionDisposition("1-1-1-1"), { espacement: { haut: 56, droite: 24, bas: 56, gauche: 24 } }),
        Array.from({ length: 4 }, () => [
          image(),
          titre("Prénom Nom", "h4", "center"),
          paragraphe("Fonction"),
        ]),
      ),
  },
  {
    cle: "appel",
    libelle: "Appel à l'action",
    description: "Une bande centrée : une phrase, un bouton.",
    apercu: [[100]],
    construire: () =>
      garnir(
        poser(creerSectionDisposition("1"), {
          espacement: { haut: 64, droite: 24, bas: 64, gauche: 24 },
          fond: "#0f172a",
        }),
        [
          [
            titre("Prêt à commencer ?", "h2", "center"),
            paragraphe("Une phrase qui lève la dernière hésitation.", "center"),
            espaceur(12),
            bouton("Commencer", "center"),
          ],
        ],
      ),
  },
  {
    cle: "texte_image",
    libelle: "Texte et image",
    description: "Une image à gauche, un bloc de texte à droite.",
    apercu: [[45, 55]],
    construire: () =>
      garnir(
        poser(creerSectionDisposition("1-1"), { espacement: { haut: 48, droite: 24, bas: 48, gauche: 24 } }),
        [
          [image()],
          [
            titre("Ce que vous voulez raconter", "h2"),
            paragraphe(
              "Deux ou trois phrases suffisent. Le reste se lit sur une autre page.",
            ),
          ],
        ],
      ),
  },
];

/** L'en-tête par défaut : le nom du site à gauche, un bouton à droite. */
export function entetePardefaut(nomDuSite: string): Noeud {
  return garnir(
    poser(creerSectionDisposition("2-1"), { espacement: { haut: 20, droite: 24, bas: 20, gauche: 24 } }),
    [[titre(nomDuSite, "h3")], [bouton("Nous contacter", "right")]],
  );
}

/** Le pied par défaut : une mention, discrète. */
export function piedParDefaut(nomDuSite: string): Noeud {
  const annee = "2026";
  return garnir(
    poser(creerSectionDisposition("1"), {
      espacement: { haut: 32, droite: 24, bas: 32, gauche: 24 },
      fond: "#0f172a",
    }),
    [[paragraphe(`© ${annee} ${nomDuSite}. Tous droits réservés.`, "center")]],
  );
}
