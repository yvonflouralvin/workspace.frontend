/** LES CAPTURES D'ÉCRAN DES MODULES.
 *
 *  Ce sont de VRAIS écrans, pris sur un espace de démonstration peuplé pour
 *  l'occasion — pas des maquettes. C'est tout l'intérêt : une maquette montre
 *  ce qu'on voudrait, une capture montre ce qui existe. Un visiteur qui
 *  reconnaît un écran réel n'a plus à nous croire sur parole.
 *
 *  LA LÉGENDE NE NOMME PAS L'ÉCRAN, ELLE DIT CE QU'IL PROUVE. « Liste des
 *  factures » ne vaut rien : on le voit. « Les échéances dépassées en rouge,
 *  les règlements partiels sous le montant » dit ce qu'on n'aurait pas
 *  remarqué, et c'est ça qui vend.
 *
 *  Toutes les images font 1600 × 1000 (16:10) : le composant compte dessus
 *  pour réserver sa place avant le chargement, et un format bâtard ferait
 *  sauter la page au moment où l'image arrive.
 */
export type Capture = {
  /** Le fichier dans `public/captures/`, sans l'extension. */
  fichier: string;
  /** Ce que l'écran prouve. Une phrase, pas un titre. */
  legende: string;
};

export const LARGEUR_CAPTURE = 1600;
export const HAUTEUR_CAPTURE = 1000;

export const captures: Record<string, Capture[]> = {
  "collaborateurs-virtuels": [
    {
      fichier: "collaborateurs-virtuels-1",
      legende:
        "Cinq collaborateurs virtuels, chacun avec son métier et ses tâches récurrentes. Ils ont un compte, des groupes et des droits comme n'importe quel membre.",
    },
    {
      fichier: "collaborateurs-virtuels-2",
      legende:
        "Chaque passage garde son compte rendu, l'heure à laquelle il a tourné, et la liste des outils qu'il a réellement appelés. Un travail qu'on ne peut pas relire ne vaut rien.",
    },
  ],
  workspace: [
    {
      fichier: "workspace-1",
      legende:
        "Dix projets, leur avancement calculé sur les tâches réellement terminées — pas un pourcentage saisi à la main.",
    },
    {
      fichier: "workspace-2",
      legende:
        "Tout ce qui vous occupe, quel que soit le projet : les tâches sans projet y sont des tâches à part entière.",
    },
    {
      fichier: "workspace-3",
      legende:
        "Les membres, leurs groupes et leurs droits. Les mêmes dans tous les modules — on ne ressaisit jamais un employé ailleurs.",
    },
  ],
  approbations: [
    {
      fichier: "approbations-1",
      legende:
        "Les circuits déclarés par les applications et ceux que vous créez librement, au même endroit.",
    },
  ],
  "tableaux-de-bord": [
    {
      fichier: "tableaux-de-bord-1",
      legende:
        "Chaque module déclare ses propres rapports ; le tableau de bord les agrège à chaud. Aucun entrepôt de données, aucune copie à synchroniser.",
    },
    {
      fichier: "tableaux-de-bord-2",
      legende: "Des tableaux de bord composés à la carte, avec les rapports des modules que vous utilisez.",
    },
  ],
  documents: [
    {
      fichier: "documents-1",
      legende:
        "Les modèles PDF que les modules utilisent pour produire une facture, un compte rendu, un bulletin — personnalisables par espace de travail.",
    },
  ],
  facturation: [
    {
      fichier: "facturation-1",
      legende:
        "Les échéances dépassées ressortent en rouge, et un règlement partiel s'affiche sous le montant dû. On voit ce qui manque sans ouvrir une seule facture.",
    },
    {
      fichier: "facturation-2",
      legende:
        "Les commandes et leur suivi, de la validation au solde. Une facture naît d'une commande, pas d'une saisie en double.",
    },
    {
      fichier: "facturation-3",
      legende:
        "Le fichier clients de la facturation, relié au répertoire des tiers quand vous l'utilisez.",
    },
  ],
  comptabilite: [
    {
      fichier: "comptabilite-1",
      legende:
        "Les écritures, par journal et par exercice. Le service refuse une écriture déséquilibrée : elle ne peut pas entrer, donc elle ne peut pas fausser la balance.",
    },
    {
      fichier: "comptabilite-2",
      legende:
        "La balance générale, par classe du référentiel OHADA, calculée sur les écritures validées.",
    },
    {
      fichier: "comptabilite-3",
      legende: "Bilan et compte de résultat simplifiés, groupés par classe OHADA.",
    },
  ],
  tiers: [
    {
      fichier: "tiers-1",
      legende:
        "Un seul répertoire pour les clients et les fournisseurs — et la même entreprise peut être les deux, ce qui arrive plus souvent qu'on ne croit.",
    },
  ],
  "stock-inventaire": [
    {
      fichier: "stock-inventaire-1",
      legende:
        "Les articles et leur stock réel, recomposé à partir de chaque entrée et de chaque sortie. Le seuil de réapprovisionnement signale ce qui va manquer.",
    },
  ],
  "ressources-humaines": [
    {
      fichier: "ressources-humaines-1",
      legende:
        "Le personnel, ses départements et ses contrats. Les échéances de période d'essai et de fin de CDD se surveillent avant d'arriver.",
    },
  ],
  exploitation: [
    {
      fichier: "exploitation-1",
      legende:
        "Les plannings de réservation : une ressource, un créneau. Les chevauchements sont détectés, pas découverts le jour même.",
    },
    {
      fichier: "exploitation-2",
      legende:
        "Un process est une routine à exécuter — une ronde, une ouverture, une clôture. Chaque exécution fige sa checklist et garde ses réponses.",
    },
  ],
  "business-firm-mission": [
    {
      fichier: "business-firm-mission-1",
      legende:
        "Les missions du cabinet, découpées en phases puis en tâches, avec leur budget et leur équipe.",
    },
    {
      fichier: "business-firm-mission-2",
      legende:
        "La fiche client : informations, contacts, contrats, missions, factures — et qui, en dehors du créateur, a le droit de l'ouvrir.",
    },
  ],
  "gestion-hospitaliere": [
    {
      fichier: "gestion-hospitaliere-1",
      legende:
        "Le répertoire des patients, cherchable par nom ou par numéro de dossier, avec les consultations, le laboratoire et l'occupation des lits derrière.",
    },
  ],
  "gestion-scolaire": [
    {
      fichier: "gestion-scolaire-1",
      legende:
        "Le registre de l'établissement : un étudiant y existe avant d'être inscrit, et y reste après.",
    },
    {
      fichier: "gestion-scolaire-2",
      legende:
        "Les promotions de l'année en cours, rattachées à la structure de l'établissement — facultés, départements, niveaux.",
    },
  ],
  "site-web-boutique": [
    {
      fichier: "site-web-boutique-1",
      legende:
        "Vos sites, leurs pages et leurs adresses. Ce que vous écrivez reste un brouillon jusqu'à ce que vous publiiez.",
    },
    {
      fichier: "site-web-boutique-2",
      legende:
        "Le builder : des sections et des widgets posés par clic ou par glissé, avec l'en-tête et le pied partagés entre les pages.",
    },
  ],
};

/** Les captures d'un module, ou un tableau vide. */
export function capturesDe(slug: string): Capture[] {
  return captures[slug] ?? [];
}
