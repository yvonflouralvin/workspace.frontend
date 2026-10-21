export interface MessageAssistant {
  id: number;
  role: "MEMBRE" | "AGENT" | "SYSTEME";
  contenu: string;
  erreur: string | null;
  cree_le: string;
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
