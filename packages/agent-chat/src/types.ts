export interface PieceJointe {
  document_id: number;
  nom: string;
  type_mime: string;
  taille: number;
  origine: "MEMBRE" | "AGENT";
}

/** Un fichier choisi mais pas encore téléversé.
 *
 *  Le téléversement n'a lieu qu'à l'envoi : il lui faut un identifiant de
 *  conversation, et la conversation n'est créée qu'au premier message — ouvrir
 *  le panneau ne doit pas laisser une coquille vide dans l'historique. */
export interface PieceEnAttente {
  cle: string;
  fichier: File;
}

/** Une écriture que l'agent veut faire, et qui attend la décision du membre.
 *
 *  Le tour est SUSPENDU tant qu'elle n'a pas de réponse : côté serveur, l'appel
 *  de l'outil est bloqué à l'attendre. Sans réponse au bout de deux minutes,
 *  c'est non — le silence ne vaut pas accord. */
export interface DemandeConfirmation {
  demande_id: string;
  outil: string;
  /** « Facturation › Créer une facture » — jamais le nom technique. */
  libelle: string;
  arguments: Record<string, unknown>;
}

export interface MessageAssistant {
  id: number;
  role: "MEMBRE" | "AGENT" | "SYSTEME";
  contenu: string;
  erreur: string | null;
  cree_le: string;
  pieces?: PieceJointe[];
}

export interface Conversation {
  id: number;
  titre: string;
  cree_le: string;
  maj_le: string;
}

export interface ConversationDetail extends Conversation {
  messages: MessageAssistant[];
}

export interface EtatConnexion {
  connectee: boolean;
  statut?: string | null;
  empreinte?: string | null;
  connecte_le?: string | null;
  dernier_echec?: string | null;
}

/** Un COLLABORATEUR VIRTUEL : un agent qui travaille quand personne ne lui parle.
 *
 *  Son compte vit dans `auth` (`user_id`), rangé dans des groupes comme
 *  n'importe quel membre — c'est de là que viennent ses droits, et c'est là
 *  qu'on le suspend pour de bon. */
export interface Collaborateur {
  id: number;
  cle: string;
  nom: string;
  role: string;
  user_id: number;
  /** QUI IL EST : son invite système. Distincte de ce qu'il a à faire —
   *  ça, ce sont ses tâches. */
  profil: string;
  fuseau: string;
  actif: boolean;
  taches: TacheRecurrente[];
}

/** UN TRAVAIL QUI REVIENT, et son horaire.
 *
 *  Un collaborateur en porte autant qu'on veut : un comptable virtuel relève
 *  les écritures en brouillon le soir et sort un état le matin. Chacune a son
 *  dernier passage — partagé, celui du soir empêcherait celui du matin. */
export interface TacheRecurrente {
  id: number;
  collaborateur_id: number;
  nom: string;
  consigne: string;
  cadence: "MANUELLE" | "QUOTIDIENNE" | "HEBDOMADAIRE";
  heure: number;
  jour: number | null;
  actif: boolean;
  dernier_passage: string | null;
}

/** Un métier qu'on sait confier à un collaborateur. Servi par le backend
 *  depuis le code : l'écran doit proposer exactement ce que le moteur sait
 *  résoudre. */
export interface RoleCollaborateur {
  cle: string;
  libelle: string;
  apps: string[];
}

export interface Mission {
  id: number;
  collaborateur_id: number;
  tache_id: number | null;
  declencheur: "PLANIFIE" | "MANUEL" | "INBOX";
  statut: "EN_ATTENTE" | "EN_COURS" | "REUSSIE" | "ECHOUEE";
  invite: string;
  compte_rendu: string;
  erreur: string | null;
  outils_offerts: string[];
  outils_appeles: string[];
  demarree_le: string | null;
  terminee_le: string | null;
  cree_le: string;
}
