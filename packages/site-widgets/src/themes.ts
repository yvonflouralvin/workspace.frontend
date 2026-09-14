import {
  bande,
  bouton,
  boutonLien,
  colonnes,
  espaceur,
  garnir,
  image,
  listeIcones,
  menu,
  paragraphe,
  poser,
  racine,
  sectionLibre,
  titre,
  type ElementMenu,
} from "./dsl";
import { creerNoeud } from "./catalogue";
import type { Lien, Noeud, Theme } from "./types";

/** Des SITES tout faits — pas des sections. Un thème donne un nom, une
 *  palette, un menu et un jeu de pages complet, à la manière d'un thème
 *  WordPress : on choisit, on obtient un site déjà écrit, déjà illustré,
 *  déjà navigable — à retoucher, pas à construire depuis une page blanche.
 *
 *  **Les images restent des CLÉS, pas des jetons.** Un thème n'appartient à
 *  aucun site : ses photos ne sont téléversées — et donc n'ont de jeton —
 *  qu'au moment où on l'applique à un site précis (voir
 *  `app/api/sites/depuis-theme` dans l'app website, le seul endroit qui
 *  connaît un `site_id`). `resoudreImagesTheme` fait cette dernière
 *  substitution, une fois les médias téléversés.
 *
 *  Comme un modèle de section, un thème ne laisse AUCUNE trace après coup :
 *  une fois les pages créées, ce sont des sections et des widgets ordinaires,
 *  identiques à ceux qu'on aurait posés à la main.
 */

export interface ImageTheme {
  url: string;
  alt: string;
}

export interface PageTheme {
  chemin: string;
  titre: string;
  estAccueil?: boolean;
  construire: () => Noeud;
}

export interface ThemeSite {
  cle: string;
  nom: string;
  secteur: string;
  description: string;
  couleurs: Theme;
  /** Aperçu du thème dans le sélecteur — pas une vraie page, juste de quoi
   *  reconnaître son identité visuelle (mêmes blocs que ApercuModeleVisuel
   *  côté modèles de section). */
  apercu: { primaire: string; secondaire: string; fond: string; policeSerif: boolean };
  images: Record<string, ImageTheme>;
  menu: ElementMenu[];
  pages: PageTheme[];
}

function imageCle(cle: string, alt: string, extra: Record<string, unknown> = {}) {
  return image({ media: { __cle: cle }, alt, ...extra });
}

/** Remplace chaque `{__cle}` posé par `imageCle` par le jeton réellement
 *  téléversé pour CE site. Lève si un thème référence une clé que
 *  l'appelant n'a pas fournie — mieux vaut un échec net qu'une image
 *  manquante silencieuse sur un site qu'on vient de créer. */
export function resoudreImagesTheme<T extends Noeud>(noeud: T, jetons: Record<string, string>): T {
  const props = noeud.props;
  const media = props?.media as { __cle?: string } | undefined;
  if (media?.__cle) {
    const jeton = jetons[media.__cle];
    if (!jeton) throw new Error(`Aucun jeton pour l'image « ${media.__cle} ».`);
    noeud.props = { ...props, media: { jeton, alt: (props as { alt?: string }).alt ?? "" } };
  }
  for (const enfant of noeud.enfants ?? []) resoudreImagesTheme(enfant, jetons);
  return noeud;
}

function poserCouleur(n: Noeud, couleur?: string) {
  return couleur ? poser(n, { couleur }) : n;
}

// ── Blocs réutilisables entre les trois thèmes ─────────────────────────────

function heroDroite(titreTxt: string, texteTxt: string, libelleBouton: string, lienBouton: Lien, cleImage: string, altImage: string) {
  return sectionLibre(
    [
      { largeur: 52, enfants: [titre(titreTxt, "h1"), paragraphe(texteTxt), espaceur(12), boutonLien(libelleBouton, lienBouton)] },
      { largeur: 48, enfants: [imageCle(cleImage, altImage, { rayon: 16, ratio: "4/3" })] },
    ],
    { espacement: { haut: 80, droite: 24, bas: 80, gauche: 24 } },
  );
}

function bandeauPage(titreTxt: string, sousTitre: string, fond: string) {
  return sectionLibre(
    [{ largeur: 100, enfants: [titre(titreTxt, "h1", "center"), paragraphe(sousTitre, "center")] }],
    { espacement: { haut: 56, droite: 24, bas: 56, gauche: 24 }, fond },
  );
}

function chiffresCles(chiffres: [string, string][], fond: string) {
  const n = chiffres.length;
  const largeur = Math.floor(100 / n);
  return sectionLibre(
    chiffres.map(([chiffre, legende], i) => ({
      largeur: i === n - 1 ? 100 - largeur * (n - 1) : largeur,
      enfants: [titre(chiffre, "h2", "center"), paragraphe(legende, "center")],
    })),
    { espacement: { haut: 48, droite: 24, bas: 48, gauche: 24 }, fond },
  );
}

function texteImage(
  titreTxt: string,
  texteTxt: string,
  cleImage: string,
  altImage: string,
  imageGauche = true,
  lienTxt?: [string, Lien],
) {
  const bloc = [titre(titreTxt, "h2"), paragraphe(texteTxt)];
  if (lienTxt) bloc.push(espaceur(8), boutonLien(lienTxt[0], lienTxt[1]));
  const img = { largeur: 46, enfants: [imageCle(cleImage, altImage, { rayon: 16, ratio: "4/3" })] };
  const txt = { largeur: 54, enfants: bloc };
  return sectionLibre([imageGauche ? img : txt, imageGauche ? txt : img], {
    espacement: { haut: 64, droite: 24, bas: 64, gauche: 24 },
  });
}

function citation(texteTxt: string, auteur: string, fond?: string) {
  return sectionLibre(
    [
      {
        largeur: 100,
        enfants: [
          poserCouleur(paragraphe(`« ${texteTxt} »`, "center", { taille: 22 }), fond && "#ffffff"),
          espaceur(8),
          poserCouleur(titre(auteur, "h4", "center"), fond && "#ffffff"),
        ],
      },
    ],
    { espacement: { haut: 64, droite: 24, bas: 64, gauche: 24 }, fond },
  );
}

function ctaSombre(titreTxt: string, texteTxt: string, libelleBouton: string, lienBouton: Lien, fond: string) {
  return sectionLibre(
    [
      {
        largeur: 100,
        enfants: [
          poserCouleur(titre(titreTxt, "h2", "center"), "#ffffff"),
          poserCouleur(paragraphe(texteTxt, "center"), "#cbd5e1"),
          espaceur(16),
          boutonLien(libelleBouton, lienBouton, "center"),
        ],
      },
    ],
    { espacement: { haut: 72, droite: 24, bas: 72, gauche: 24 }, fond, alignement_vertical: "centre" },
  );
}

function grilleServices(items: [string, string, string][], colonnesParLigne = 3) {
  const largeur = Math.floor(100 / colonnesParLigne);
  const lignes: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += colonnesParLigne) lignes.push(items.slice(i, i + colonnesParLigne));
  return lignes.map((ligne, li) =>
    sectionLibre(
      ligne.map(([iconeCle, nom, desc], i) => ({
        largeur: li === lignes.length - 1 && i === ligne.length - 1 ? 100 - largeur * (ligne.length - 1) : largeur,
        enfants: [listeIcones([{ icone: iconeCle, texte: "" }]), titre(nom, "h4"), paragraphe(desc)],
      })),
      { espacement: { haut: li === 0 ? 56 : 8, droite: 24, bas: 56, gauche: 24 } },
    ),
  );
}

function equipeGrille(membres: [string, string, string][]) {
  return sectionLibre(
    membres.map(([cleImage, nom, role]) => ({
      largeur: 25,
      enfants: [imageCle(cleImage, nom, { rayon: 999, ratio: "1/1" }), titre(nom, "h4", "center"), paragraphe(role, "center")],
    })),
    { espacement: { haut: 56, droite: 24, bas: 56, gauche: 24 } },
  );
}

function contactCoordonnees(
  titreTxt: string,
  elementsIcones: { icone: string; texte: string }[],
  texteTxt: string,
  libelleBouton: string,
  lienBouton: Lien,
) {
  return sectionLibre(
    [
      { largeur: 50, enfants: [titre(titreTxt, "h2"), espaceur(8), listeIcones(elementsIcones)] },
      { largeur: 50, enfants: [paragraphe(texteTxt), espaceur(12), boutonLien(libelleBouton, lienBouton)] },
    ],
    { espacement: { haut: 64, droite: 24, bas: 64, gauche: 24 } },
  );
}

function enteteAvecMenu(nomSite: string, liens: ElementMenu[]) {
  return racine([
    sectionLibre(
      [
        { largeur: 40, enfants: [titre(nomSite, "h3")] },
        { largeur: 60, enfants: [menu(liens, "right")] },
      ],
      { espacement: { haut: 22, droite: 24, bas: 22, gauche: 24 }, alignement_vertical: "centre" },
    ),
  ]);
}

function piedAvecMenu(nomSite: string, liens: ElementMenu[], fond: string) {
  return racine([
    sectionLibre(
      [
        {
          largeur: 100,
          enfants: [menu(liens, "center"), espaceur(16), poserCouleur(paragraphe(`© 2026 ${nomSite}. Tous droits réservés.`, "center"), "#e2e8f0")],
        },
      ],
      { espacement: { haut: 40, droite: 24, bas: 32, gauche: 24 }, fond },
    ),
  ]);
}

function u(photoId: string, w: number) {
  return `https://images.unsplash.com/${photoId}?w=${w}&q=75&fm=jpg&fit=crop&auto=format`;
}

const IMAGES_HEADSHOTS: Record<string, ImageTheme> = {
  head_1: { url: u("photo-1560250097-0b93528c311a", 800), alt: "Portrait professionnel" },
  head_2: { url: u("photo-1627161683077-e34782c24d81", 800), alt: "Portrait professionnel" },
  head_3: { url: u("photo-1573496359142-b8d87734a5a2", 800), alt: "Portrait professionnel" },
  head_4: { url: u("photo-1573497019940-1c28c88b4f3e", 800), alt: "Portrait professionnel" },
};

// ═══════════════════════════════════════════════════════════════════════
// THÈME — CABINET D'AVOCATS
// ═══════════════════════════════════════════════════════════════════════
const AVOCATS: ThemeSite = {
  cle: "cabinet-avocats",
  nom: "Cabinet d'avocats",
  secteur: "Services juridiques",
  description: "Un site institutionnel — expertises, équipe, prise de contact — pour un cabinet qui vend la confiance autant que le conseil.",
  couleurs: {
    primaire: "#1c2d4f",
    secondaire: "#8a6d3a",
    fond: "#faf9f6",
    texte: "#1a1a1a",
    texte_doux: "#5c5c5c",
    police_titre: "Georgia, 'Times New Roman', serif",
    police_texte: "Inter, system-ui, sans-serif",
    rayon: 4,
    largeur_contenu: 1180,
  },
  apercu: { primaire: "#1c2d4f", secondaire: "#8a6d3a", fond: "#faf9f6", policeSerif: true },
  images: {
    ...IMAGES_HEADSHOTS,
    hero: { url: u("photo-1497366754035-f200968a6e72", 1600), alt: "Bureaux du cabinet" },
    about: { url: u("photo-1505664194779-8beaceb93744", 1200), alt: "Bibliothèque juridique" },
    books: { url: u("photo-1521587760476-6c12a4b040da", 1200), alt: "Ouvrages de droit" },
  },
  menu: [
    { libelle: "Accueil", lien: { page: "/" } },
    { libelle: "À propos", lien: { page: "/a-propos" } },
    { libelle: "Expertises", lien: { page: "/expertises" } },
    { libelle: "Équipe", lien: { page: "/equipe" } },
    { libelle: "Contact", lien: { page: "/contact" } },
  ],
  pages: [
    {
      chemin: "/",
      titre: "Accueil",
      estAccueil: true,
      construire: () =>
        racine([
          heroDroite(
            "Un conseil juridique exigeant, à votre écoute",
            "Votre cabinet accompagne dirigeants, familles et institutions dans leurs décisions les plus déterminantes — avec la rigueur d'un grand cabinet et la disponibilité d'une équipe à taille humaine.",
            "Prendre rendez-vous",
            { page: "/contact" },
            "hero",
            "Bureaux du cabinet",
          ),
          ...grilleServices([
            ["business_center", "Droit des affaires", "Structuration, contrats, fusions-acquisitions."],
            ["home", "Droit immobilier", "Transactions, baux commerciaux, contentieux."],
            ["diversity_3", "Droit de la famille", "Divorce, succession, protection du patrimoine."],
          ]),
          chiffresCles(
            [
              ["25 ans", "d'expérience"],
              ["1 200+", "dossiers traités"],
              ["98 %", "de clients satisfaits"],
              ["12", "associés et collaborateurs"],
            ],
            "#f1efe9",
          ),
          texteImage(
            "Une maison de conseil, pas un guichet",
            "Chaque dossier est suivi par un associé, du premier rendez-vous jusqu'à sa résolution. Un bon conseil juridique se construit dans la durée, pas dans l'urgence — même quand l'urgence, elle, ne prévient pas.",
            "about",
            "Bibliothèque du cabinet",
            false,
          ),
          citation(
            "L'équipe a suivi la cession de notre entreprise familiale avec une rigueur et une humanité rares. Nous nous sommes sentis accompagnés, jamais seulement facturés.",
            "Directeur général, groupe industriel",
          ),
          ctaSombre(
            "Un besoin juridique urgent ?",
            "Le premier échange est toujours gratuit — pour comprendre votre situation avant de vous conseiller.",
            "Nous contacter",
            { page: "/contact" },
            "#1c2d4f",
          ),
        ]),
    },
    {
      chemin: "/a-propos",
      titre: "À propos",
      construire: () =>
        racine([
          bandeauPage("À propos du cabinet", "Une conviction inchangée depuis les débuts.", "#f1efe9"),
          texteImage(
            "Notre histoire",
            "Le droit doit servir une décision, pas la compliquer : c'est l'idée qui a présidé à la fondation du cabinet, et qui continue de guider chaque associé, chaque dossier, chaque conseil.",
            "books",
            "Ouvrages de droit du cabinet",
          ),
          ...grilleServices([
            ["balance", "Rigueur", "Chaque dossier est documenté, argumenté, anticipé."],
            ["support_agent", "Écoute", "Comprendre la situation avant de proposer une stratégie."],
            ["verified", "Résultat", "Le conseil se juge à ce qu'il permet d'obtenir."],
          ]),
        ]),
    },
    {
      chemin: "/expertises",
      titre: "Expertises",
      construire: () =>
        racine([
          bandeauPage("Nos domaines d'expertise", "Six pôles, une même exigence.", "#f1efe9"),
          ...grilleServices([
            ["business_center", "Droit des affaires", "Structuration de sociétés, contrats commerciaux, fusions-acquisitions."],
            ["home", "Droit immobilier", "Transactions, baux commerciaux et résidentiels, contentieux."],
            ["diversity_3", "Droit de la famille", "Divorce, garde, succession, protection du patrimoine familial."],
            ["work", "Droit du travail", "Contrats, licenciements, contentieux prud'homal."],
            ["gavel", "Droit pénal", "Défense pénale des particuliers et des entreprises."],
            ["lightbulb", "Propriété intellectuelle", "Marques, brevets, protection des créations."],
          ]),
        ]),
    },
    {
      chemin: "/equipe",
      titre: "Équipe",
      construire: () =>
        racine([
          bandeauPage("Notre équipe", "Des avocats, plusieurs pôles d'expertise.", "#f1efe9"),
          equipeGrille([
            ["head_1", "Me Antoine Lefèvre", "Associé fondateur"],
            ["head_2", "Me Camille Roussel", "Avocate associée"],
            ["head_3", "Me Hélène Fontaine", "Counsel"],
            ["head_4", "Me Sofia Marchetti", "Avocate collaboratrice"],
          ]),
        ]),
    },
    {
      chemin: "/contact",
      titre: "Contact",
      construire: () =>
        racine([
          bandeauPage("Nous contacter", "Le premier échange est toujours gratuit.", "#f1efe9"),
          contactCoordonnees(
            "Coordonnées",
            [
              { icone: "call", texte: "+243 81 000 0000" },
              { icone: "email", texte: "contact@votre-cabinet.cd" },
              { icone: "location_on", texte: "Adresse du cabinet" },
            ],
            "Une question, un dossier à évoquer ? Écrivez-nous et un associé vous recontactera sous 24 heures ouvrées.",
            "Nous écrire",
            { href: "mailto:contact@votre-cabinet.cd" },
          ),
        ]),
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// THÈME — CABINET D'AUDIT
// ═══════════════════════════════════════════════════════════════════════
const AUDIT: ThemeSite = {
  cle: "cabinet-audit",
  nom: "Cabinet d'audit",
  secteur: "Audit, conseil & expertise comptable",
  description: "Vitrine institutionnelle pour un cabinet d'audit et de conseil — services, chiffres clés, équipe et prise de contact.",
  couleurs: {
    primaire: "#0f4c81",
    secondaire: "#0f9d78",
    fond: "#ffffff",
    texte: "#0f172a",
    texte_doux: "#475569",
    police_titre: "Inter, system-ui, sans-serif",
    police_texte: "Inter, system-ui, sans-serif",
    rayon: 10,
    largeur_contenu: 1180,
  },
  apercu: { primaire: "#0f4c81", secondaire: "#0f9d78", fond: "#ffffff", policeSerif: false },
  images: {
    ...IMAGES_HEADSHOTS,
    hero: { url: u("photo-1600531529272-023c4b821f14", 1600), alt: "Siège du cabinet" },
    team: { url: u("photo-1758873268745-dd2cf0d677b5", 1200), alt: "Équipe en réunion" },
  },
  menu: [
    { libelle: "Accueil", lien: { page: "/" } },
    { libelle: "À propos", lien: { page: "/a-propos" } },
    { libelle: "Services", lien: { page: "/services" } },
    { libelle: "Équipe", lien: { page: "/equipe" } },
    { libelle: "Contact", lien: { page: "/contact" } },
  ],
  pages: [
    {
      chemin: "/",
      titre: "Accueil",
      estAccueil: true,
      construire: () =>
        racine([
          heroDroite(
            "La clarté financière, au service de vos décisions",
            "Votre cabinet accompagne entreprises et institutions dans l'audit, la fiscalité et le pilotage financier — avec la précision d'un grand cabinet et la proximité d'une équipe qui connaît vos dossiers.",
            "Demander un devis",
            { page: "/contact" },
            "hero",
            "Siège du cabinet",
          ),
          ...grilleServices([
            ["fact_check", "Audit légal", "Commissariat aux comptes et audit contractuel."],
            ["insights", "Conseil financier", "Structuration, levée de fonds, pilotage de la performance."],
            ["calculate", "Expertise comptable", "Tenue, révision et clôture de vos comptes."],
          ]),
          chiffresCles(
            [
              ["30 ans", "d'expérience"],
              ["800+", "clients accompagnés"],
              ["15", "pays d'intervention"],
              ["60", "collaborateurs"],
            ],
            "#f0f6fb",
          ),
          texteImage(
            "Une équipe, une exigence",
            "Nos associés interviennent personnellement sur chaque mission. Nous ne livrons pas un rapport : nous livrons une compréhension partagée de vos chiffres, condition de toute décision solide.",
            "team",
            "L'équipe en réunion",
            false,
          ),
          citation(
            "Le cabinet a restructuré notre reporting financier en trois mois. Nous pilotons aujourd'hui notre activité avec des chiffres que nous comprenons enfin.",
            "Directrice financière, groupe agroalimentaire",
          ),
          ctaSombre(
            "Parlons de vos enjeux financiers",
            "Un premier échange, sans engagement, pour cerner vos besoins.",
            "Prendre contact",
            { page: "/contact" },
            "#0f172a",
          ),
        ]),
    },
    {
      chemin: "/a-propos",
      titre: "À propos",
      construire: () =>
        racine([
          bandeauPage("À propos du cabinet", "Trente ans au service de la rigueur financière.", "#f0f6fb"),
          texteImage(
            "Notre histoire",
            "Votre cabinet s'est développé au rythme de ses clients — d'une pratique locale à une présence dans plusieurs pays. Notre méthode n'a pas changé : chaque mission est conduite par un associé, jamais déléguée sans supervision directe.",
            "team",
            "L'équipe du cabinet",
          ),
          ...grilleServices([
            ["shield", "Indépendance", "Aucun conflit d'intérêt ne compromet notre jugement."],
            ["speed", "Réactivité", "Des délais tenus, même sous contrainte réglementaire."],
            ["handshake", "Proximité", "Un interlocuteur unique, du premier au dernier jour."],
          ]),
        ]),
    },
    {
      chemin: "/services",
      titre: "Services",
      construire: () =>
        racine([
          bandeauPage("Nos services", "Six missions, une même méthode.", "#f0f6fb"),
          ...grilleServices([
            ["fact_check", "Audit légal", "Commissariat aux comptes, audit contractuel et de conformité."],
            ["insights", "Conseil financier", "Levée de fonds, structuration, évaluation d'entreprise."],
            ["percent", "Fiscalité", "Optimisation fiscale et accompagnement au contrôle."],
            ["calculate", "Expertise comptable", "Tenue, révision, clôture et liasse fiscale."],
            ["hub", "Conseil en gestion", "Organisation, contrôle de gestion, tableaux de bord."],
            ["school", "Formation", "Normes comptables et financières pour vos équipes."],
          ]),
        ]),
    },
    {
      chemin: "/equipe",
      titre: "Équipe",
      construire: () =>
        racine([
          bandeauPage("Notre équipe", "Des collaborateurs, quatre pôles.", "#f0f6fb"),
          equipeGrille([
            ["head_2", "Marc Delvaux", "Associé gérant"],
            ["head_3", "Nadia Kombozi", "Directrice Audit"],
            ["head_1", "Thomas Henriot", "Directeur Conseil"],
            ["head_4", "Lucie Bakari", "Responsable Fiscalité"],
          ]),
        ]),
    },
    {
      chemin: "/contact",
      titre: "Contact",
      construire: () =>
        racine([
          bandeauPage("Nous contacter", "Un premier échange, sans engagement.", "#f0f6fb"),
          contactCoordonnees(
            "Coordonnées",
            [
              { icone: "call", texte: "+243 82 000 0000" },
              { icone: "email", texte: "contact@votre-cabinet-audit.cd" },
              { icone: "location_on", texte: "Adresse du cabinet" },
            ],
            "Décrivez-nous votre besoin, un associé vous répond sous 24 heures ouvrées.",
            "Nous écrire",
            { href: "mailto:contact@votre-cabinet-audit.cd" },
          ),
        ]),
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// THÈME — E-COMMERCE / MODE
// ═══════════════════════════════════════════════════════════════════════
const ECOMMERCE: ThemeSite = {
  cle: "boutique-mode",
  nom: "Boutique de mode",
  secteur: "E-commerce",
  description: "Vitrine + boutique en ligne déjà branchée — accueil, catégories, histoire de la marque et contact, prêts pour vos produits.",
  couleurs: {
    primaire: "#b7472a",
    secondaire: "#1a1a1a",
    fond: "#fbf8f5",
    texte: "#231f1c",
    texte_doux: "#7a716b",
    police_titre: "Georgia, 'Times New Roman', serif",
    police_texte: "Inter, system-ui, sans-serif",
    rayon: 18,
    largeur_contenu: 1180,
  },
  apercu: { primaire: "#b7472a", secondaire: "#1a1a1a", fond: "#fbf8f5", policeSerif: true },
  images: {
    hero: { url: u("photo-1570857502809-08184874388e", 1600), alt: "Vitrine de la boutique" },
    rack: { url: u("photo-1532453288672-3a27e9be9efd", 900), alt: "Collection Femme" },
    shelf: { url: u("photo-1441986300917-64674bd600d8", 900), alt: "Accessoires" },
    minimal: { url: u("photo-1603400521630-9f2de124b33b", 900), alt: "Collection Homme" },
    boutique: { url: u("photo-1441984904996-e0b6ba687e04", 1200), alt: "Intérieur de la boutique" },
    industrial: { url: u("photo-1567401893414-76b7b1e5a7a5", 1200), alt: "Sélection en atelier" },
  },
  menu: [
    { libelle: "Accueil", lien: { page: "/" } },
    { libelle: "Boutique", lien: { href: "/boutique" } },
    { libelle: "Notre histoire", lien: { page: "/notre-histoire" } },
    { libelle: "Contact", lien: { page: "/contact" } },
  ],
  pages: [
    {
      chemin: "/",
      titre: "Accueil",
      estAccueil: true,
      construire: () =>
        racine([
          heroDroite(
            "Une garde-robe qui vous ressemble",
            "Des pièces choisies pour durer, des matières qui se portent bien — la mode pensée comme un vestiaire, pas comme une tendance.",
            "Découvrir la boutique",
            { href: "/boutique" },
            "hero",
            "Vitrine de la boutique",
          ),
          sectionLibre(
            [
              { largeur: 33, enfants: [imageCle("rack", "Collection Femme", { rayon: 18, ratio: "3/4" }), espaceur(8), titre("Femme", "h4", "center")] },
              { largeur: 33, enfants: [imageCle("minimal", "Collection Homme", { rayon: 18, ratio: "3/4" }), espaceur(8), titre("Homme", "h4", "center")] },
              { largeur: 34, enfants: [imageCle("shelf", "Accessoires", { rayon: 18, ratio: "3/4" }), espaceur(8), titre("Accessoires", "h4", "center")] },
            ],
            { espacement: { haut: 48, droite: 24, bas: 24, gauche: 24 } },
          ),
          sectionLibre(
            [
              {
                largeur: 100,
                enfants: [
                  listeIcones(
                    [
                      { icone: "local_shipping", texte: "Livraison offerte dès 75 $" },
                      { icone: "autorenew", texte: "Retours gratuits sous 30 jours" },
                      { icone: "lock", texte: "Paiement 100 % sécurisé" },
                    ],
                    "horizontale",
                  ),
                ],
              },
            ],
            { espacement: { haut: 32, droite: 24, bas: 48, gauche: 24 }, alignement_vertical: "centre" },
          ),
          texteImage(
            "Notre histoire",
            "Votre boutique choisit des matières responsables et des ateliers qu'elle connaît, pièce par pièce — moins de références, plus d'exigence.",
            "boutique",
            "L'intérieur de la boutique",
            true,
            ["Notre histoire", { page: "/notre-histoire" }],
          ),
          sectionLibre(
            [
              {
                largeur: 100,
                enfants: [
                  titre("Restez informé", "h2", "center"),
                  paragraphe("Nouveautés et ventes privées, une fois par mois.", "center"),
                  espaceur(12),
                  creerNoeud("abonnement"),
                ],
              },
            ],
            { espacement: { haut: 56, droite: 24, bas: 56, gauche: 24 }, fond: "#f1e7e0" },
          ),
        ]),
    },
    {
      chemin: "/notre-histoire",
      titre: "Notre histoire",
      construire: () =>
        racine([
          bandeauPage("Notre histoire", "Une boutique, une conviction.", "#f1e7e0"),
          texteImage(
            "Des choix, pas des compromis",
            "Chaque saison, une sélection resserrée de pièces auprès d'ateliers visités et suivis. Moins de références, plus d'exigence — la réponse à la mode jetable.",
            "industrial",
            "Sélection en atelier",
          ),
          sectionLibre(
            [
              { largeur: 33, enfants: [titre("Matières responsables", "h4"), paragraphe("Coton biologique, laine tracée, fibres recyclées.")] },
              { largeur: 33, enfants: [titre("Ateliers partenaires", "h4"), paragraphe("Une dizaine d'ateliers visités et suivis chaque année.")] },
              { largeur: 34, enfants: [titre("Petites séries", "h4"), paragraphe("Des quantités limitées, jamais de surproduction.")] },
            ],
            { espacement: { haut: 56, droite: 24, bas: 56, gauche: 24 } },
          ),
        ]),
    },
    {
      chemin: "/contact",
      titre: "Contact",
      construire: () =>
        racine([
          bandeauPage("Nous contacter", "Une question sur une commande, une pièce, une taille ?", "#f1e7e0"),
          contactCoordonnees(
            "Coordonnées",
            [
              { icone: "call", texte: "+243 89 000 0000" },
              { icone: "email", texte: "bonjour@votre-boutique.cd" },
              { icone: "location_on", texte: "Adresse de la boutique" },
            ],
            "Notre équipe répond du lundi au samedi, sous 24 heures.",
            "Nous écrire",
            { href: "mailto:bonjour@votre-boutique.cd" },
          ),
        ]),
    },
  ],
};

export const THEMES_SITE: ThemeSite[] = [AVOCATS, AUDIT, ECOMMERCE];

export function entetePourTheme(theme: ThemeSite): Noeud {
  return enteteAvecMenu(theme.nom, theme.menu);
}

export function piedPourTheme(theme: ThemeSite): Noeud {
  return piedAvecMenu(theme.nom, theme.menu, theme.couleurs.secondaire ?? "#0f172a");
}
