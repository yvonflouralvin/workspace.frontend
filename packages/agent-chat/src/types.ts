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
