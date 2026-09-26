export type Produit = {
  slug: string;
  nom: string;
  categorie: string;
  icone: string;
  accroche: string;
  resume: string;
  description: string;
  points: string[];
};

export const categories = [
  "Cœur de plateforme",
  "Finance & gestion commerciale",
  "Ressources humaines & exploitation",
  "Solutions métier",
  "Présence en ligne",
] as const;

export const produits: Produit[] = [
  {
    slug: "workspace",
    nom: "Espace de travail",
    categorie: "Cœur de plateforme",
    icone: "Hub",
    accroche: "Le tableau de bord où votre équipe travaille chaque jour",
    resume:
      "Projets, membres, agenda et formulaires réunis dans un seul espace, avec un journal d'activité qui garde une trace de tout.",
    description:
      "L'espace de travail est le point d'entrée de toute la plateforme : c'est ici que chaque membre retrouve ses projets, son agenda et ce qu'on attend de lui aujourd'hui. Les projets s'organisent en tâches et échéances, l'agenda répond à « qu'est-ce qu'il y a à faire, du plus proche au plus lointain », et le module Formulaire remplace les échanges par e-mail pour tout ce qui se collecte et se dépouille. Un journal d'activité consigne qui a fait quoi, pour que rien ne se perde entre deux personnes.",
    points: [
      "Projets et tâches avec échéances, priorités et responsables",
      "Agenda unifié : ce qui est en retard, aujourd'hui, à venir",
      "Formulaires internes façon Google Forms, avec dépouillement automatique",
      "Journal d'activité horodaté sur tout le workspace",
      "Membres, rôles et permissions par groupe",
    ],
  },
  {
    slug: "approbations",
    nom: "Circuits d'approbation",
    categorie: "Cœur de plateforme",
    icone: "AccountTree",
    accroche: "Chaque demande suit un chemin clair, jusqu'à la bonne signature",
    resume:
      "Construisez vos propres circuits de validation — congés, achats, notes de frais — sans écrire une ligne de code.",
    description:
      "Les circuits d'approbation remplacent la chaîne de validations par e-mail ou papier par un chemin explicite : qui doit approuver, dans quel ordre, et ce qui se passe en cas de refus. Une entreprise construit ses propres circuits pour ses propres besoins — demande de congé, bon d'achat, note de frais — et les branche à n'importe quel formulaire ou module métier qui a besoin d'une validation avant de continuer.",
    points: [
      "Circuits construits librement, étape par étape",
      "Notifications automatiques à chaque étape franchie",
      "Historique complet : qui a validé, qui a renvoyé, quand",
      "Se branche à un formulaire ou à un autre module de la plateforme",
      "Console de suivi pour retrouver une demande à tout moment",
    ],
  },
  {
    slug: "tableaux-de-bord",
    nom: "Tableaux de bord",
    categorie: "Cœur de plateforme",
    icone: "Insights",
    accroche: "Une vue d'ensemble, alimentée en direct par chaque module",
    resume:
      "Des rapports agrégés en temps réel — ventes, finances, activité — sans exporter un seul fichier Excel.",
    description:
      "Les tableaux de bord rassemblent les chiffres qui comptent, directement depuis les modules qui les produisent — pas de copier-coller, pas d'export périmé le lendemain de sa génération. Chaque application de la plateforme déclare ses propres rapports, et le tableau de bord les affiche filtrés selon les permissions de la personne qui regarde.",
    points: [
      "Données rafraîchies en direct, pas un instantané figé",
      "Graphiques, indicateurs clés et tableaux, au même endroit",
      "Filtrage automatique selon les droits de chaque utilisateur",
      "Un rapport ajouté à un module apparaît ici sans configuration",
    ],
  },
  {
    slug: "documents",
    nom: "Documents",
    categorie: "Cœur de plateforme",
    icone: "Description",
    accroche: "Vos modèles de documents, générés au bon format à chaque fois",
    resume:
      "Factures, attestations, rapports : concevez un modèle une fois, générez-le en PDF autant de fois qu'il le faut.",
    description:
      "Le module Documents porte les modèles PDF de l'entreprise — mise en page, en-têtes, variables — pour que chaque facture, attestation ou rapport sorte identique, à jour, et au bon format. Les autres modules de la plateforme s'y branchent pour produire leurs propres documents sans réinventer une mise en page à chaque fois.",
    points: [
      "Éditeur de mise en page visuel, sans toucher au code",
      "Génération PDF à la demande, depuis n'importe quel module",
      "Variables réutilisables : logo, coordonnées, mentions légales",
      "Bibliothèque de modèles partagée dans toute l'entreprise",
    ],
  },
  {
    slug: "facturation",
    nom: "Facturation",
    categorie: "Finance & gestion commerciale",
    icone: "ReceiptLong",
    accroche: "Du devis à la facture payée, sans changer d'outil",
    resume:
      "Clients, catalogue produits, commandes et factures dans un seul module, relié à votre comptabilité.",
    description:
      "Le module Facturation couvre tout le cycle commercial : un catalogue de produits avec ses prix et sa TVA, des clients, des commandes qui deviennent des factures, et un suivi des paiements jusqu'au dernier centime. Chaque facture émise peut se comptabiliser automatiquement — plus besoin de ressaisir les mêmes montants deux fois.",
    points: [
      "Catalogue produits avec catégories, prix et TVA",
      "Commandes et factures, du brouillon au paiement encaissé",
      "Suivi des règlements, facture par facture",
      "Comptabilisation automatique vers le module Comptabilité",
      "Clients partagés avec le reste de la plateforme",
    ],
  },
  {
    slug: "comptabilite",
    nom: "Comptabilité",
    categorie: "Finance & gestion commerciale",
    icone: "AccountBalance",
    accroche: "Une comptabilité générale conforme, à jour en temps réel",
    resume:
      "Plan comptable OHADA, journaux, écritures et grand livre — la comptabilité de l'entreprise, sans tableur séparé.",
    description:
      "Le module Comptabilité tient une comptabilité générale conforme au référentiel OHADA : plan comptable prêt à l'emploi, journaux, écritures équilibrées débit/crédit, grand livre, balance et états de synthèse. Les factures du module Facturation s'y comptabilisent automatiquement, ventilées entre hors-taxe, TVA et TTC.",
    points: [
      "Plan comptable OHADA chargeable en un clic",
      "Écritures brouillon → validée, équilibre imposé",
      "Grand livre, balance, bilan et compte de résultat",
      "Comptabilisation automatique des factures émises",
      "Verrouillage par exercice comptable",
    ],
  },
  {
    slug: "tiers",
    nom: "Répertoire tiers",
    categorie: "Finance & gestion commerciale",
    icone: "Contacts",
    accroche: "Une seule fiche par client ou fournisseur, partagée partout",
    resume:
      "Le répertoire central des clients et fournisseurs de l'entreprise, que les autres modules viennent enrichir.",
    description:
      "Le répertoire des tiers évite la fiche client dupliquée dans chaque module : une entreprise ou un particulier n'existe qu'une fois, et c'est cette fiche que la Facturation, le Stock ou d'autres modules métier viennent lire et compléter selon leurs propres besoins.",
    points: [
      "Une fiche unique par client ou fournisseur",
      "Coordonnées, contacts et historique au même endroit",
      "Partagé entre tous les modules qui ont besoin d'un tiers",
      "Recherche rapide sur toute la base",
    ],
  },
  {
    slug: "stock-inventaire",
    nom: "Stock & inventaire",
    categorie: "Finance & gestion commerciale",
    icone: "Inventory2",
    accroche: "Sachez toujours ce qu'il vous reste, où, et depuis quand",
    resume:
      "Articles, catégories et mouvements de stock, pour ne plus découvrir une rupture au moment de vendre.",
    description:
      "Le module Stock & Inventaire suit les articles de l'entreprise, leurs catégories et chaque mouvement — entrée, sortie, ajustement — pour que la quantité disponible affichée soit toujours la vraie. Il se branche au catalogue de la Facturation pour que vendre un produit épuisé ne soit plus une surprise.",
    points: [
      "Articles et catégories, avec seuils d'alerte",
      "Historique complet des mouvements de stock",
      "Inventaires réguliers pour recaler les quantités",
      "Lien avec le catalogue produits de la Facturation",
    ],
  },
  {
    slug: "ressources-humaines",
    nom: "Ressources humaines",
    categorie: "Ressources humaines & exploitation",
    icone: "Groups",
    accroche: "Les dossiers de vos employés, sans dossier papier",
    resume:
      "Dossiers employés, documents RH et demandes de congés dans un module pensé pour grandir avec votre équipe.",
    description:
      "Le module Ressources humaines centralise les dossiers des employés — informations, documents, historique — et s'appuie sur les circuits d'approbation pour les demandes qui doivent être validées, comme les congés. Une base commune pour toute équipe RH, quelle que soit la taille de l'entreprise.",
    points: [
      "Dossier employé complet, documents inclus",
      "Demandes de congés via les circuits d'approbation",
      "Historique RH conservé et consultable",
      "Pensé pour évoluer avec la croissance de l'équipe",
    ],
  },
  {
    slug: "exploitation",
    nom: "Exploitation",
    categorie: "Ressources humaines & exploitation",
    icone: "PlaylistAddCheck",
    accroche: "Vos routines de terrain, transformées en checklists fiables",
    resume:
      "Plannings, sites et process d'exploitation — rondes de contrôle, clôtures — exécutés et archivés à chaque passage.",
    description:
      "Le module Exploitation gère les ressources et les sites de l'entreprise, leurs plannings de réservation, et les process récurrents du terrain — une ronde de contrôle, une clôture de caisse — sous forme de checklists structurées en étapes et points de contrôle. Chaque exécution fige la checklist telle qu'elle a été remplie, avec ses réponses et ses anomalies éventuelles.",
    points: [
      "Plannings de réservation par ressource ou par site",
      "Process construits comme des checklists réutilisables",
      "Points de contrôle avec bornes et détection d'anomalie",
      "Historique de chaque exécution, figé et consultable",
    ],
  },
  {
    slug: "business-firm-mission",
    nom: "Missions & cabinets",
    categorie: "Solutions métier",
    icone: "Gavel",
    accroche: "Le suivi de mission pensé pour les cabinets d'expertise et d'audit",
    resume:
      "Clients, missions, phases et tâches — avec droits par collaborateur — pour les cabinets comptables, fiscaux et d'audit.",
    description:
      "Conçu pour les cabinets qui gèrent des missions pour le compte de leurs clients — expertise comptable, audit, assistance fiscale — ce module structure chaque mission en phases et en tâches, avec des droits précis par collaborateur : qui peut modifier la mission, valider un résultat, ou seulement travailler sur ce qui lui est assigné. Un portail dédié permet même au client final de suivre l'avancement de sa propre mission, sans jamais voir les notes internes du cabinet.",
    points: [
      "Missions organisées en phases et tâches, vue liste ou kanban",
      "Droits par collaborateur : qui peut faire quoi, sur quelle mission",
      "Cycle de validation : exécutant, validateur, historique complet",
      "Portail client pour suivre sa mission sans accéder à l'interne",
      "Suivi d'audit avec anomalies, risques et rapports provisoire/final",
    ],
  },
  {
    slug: "gestion-hospitaliere",
    nom: "Gestion hospitalière",
    categorie: "Solutions métier",
    icone: "LocalHospital",
    accroche: "Le dossier patient et le suivi clinique, en un seul endroit",
    resume:
      "Patients, contacts et suivi clinique pour les établissements de santé qui veulent sortir du papier.",
    description:
      "Le module de gestion hospitalière centralise le dossier patient et les contacts associés, avec un suivi clinique pensé pour les équipes soignantes au quotidien. Il s'appuie sur le socle commun de la plateforme — notifications, documents, tableaux de bord — pour rester cohérent avec le reste de l'établissement.",
    points: [
      "Dossier patient centralisé et partagé entre les équipes",
      "Suivi clinique et historique des passages",
      "Notifications entre soignants sur les cas en cours",
      "Génération de documents médicaux depuis des modèles",
    ],
  },
  {
    slug: "gestion-scolaire",
    nom: "Gestion scolaire",
    categorie: "Solutions métier",
    icone: "School",
    accroche: "Votre établissement, de l'inscription au bulletin",
    resume:
      "Un module pensé pour les écoles et établissements qui veulent piloter leur activité sans multiplier les outils.",
    description:
      "Le module Académique fabrique l'établissement d'un client dès l'activation — l'objet central sans lequel aucun de ses écrans ne fonctionne — pour que rien n'ait à être configuré à la main avant de commencer. Il s'intègre au reste de la plateforme pour la facturation des frais de scolarité et le suivi administratif.",
    points: [
      "Établissement provisionné automatiquement à l'activation",
      "Suivi administratif adapté au monde scolaire",
      "Facturation des frais liée au module Facturation",
      "Même socle de permissions et de notifications que le reste",
    ],
  },
  {
    slug: "site-web-boutique",
    nom: "Site web & boutique",
    categorie: "Présence en ligne",
    icone: "Storefront",
    accroche: "Votre vitrine et votre boutique en ligne, construites par glisser-déposer",
    resume:
      "Un site professionnel avec sa boutique en ligne, sans agence ni développeur — pages, thème et domaine personnalisé inclus.",
    description:
      "Le module Site web laisse composer des pages par simple glissé de sections — en-tête, catalogue, formulaire de contact — avec un thème personnalisable et un historique des versions pour revenir en arrière sans risque. La boutique intégrée gère catalogue, panier et commandes pour vendre en ligne directement depuis le site, reliée à la Facturation pour ne jamais tenir deux catalogues séparés. Chaque site peut être publié sur son propre nom de domaine.",
    points: [
      "Éditeur de pages par glisser-déposer, aucun code requis",
      "Boutique en ligne : catalogue, panier, commandes, clients",
      "Domaine personnalisé, avec certificat HTTPS automatique",
      "Historique des versions pour publier sans crainte",
      "Catalogue relié à la Facturation — un seul produit, deux vitrines",
    ],
  },
];

export function getProduit(slug: string): Produit | undefined {
  return produits.find((p) => p.slug === slug);
}

export function produitsParCategorie(): { categorie: string; items: Produit[] }[] {
  return categories.map((categorie) => ({
    categorie,
    items: produits.filter((p) => p.categorie === categorie),
  }));
}
