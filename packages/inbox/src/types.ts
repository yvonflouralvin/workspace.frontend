/** Un interlocuteur, humain ou virtuel.
 *
 *  `collaborateur` vient d'`auth` (`is_service`) : la boîte ne tient pas sa
 *  propre liste d'agents, elle lit celle des membres. */
export interface Personne {
  user_id: number;
  nom: string;
  collaborateur: boolean;
}

export interface MessageFil {
  id: number;
  auteur_user_id: number;
  auteur_nom: string;
  contenu: string;
  /** Renseigné quand un collaborateur n'a pas pu faire le travail. Le message
   *  est posé QUAND MÊME : un fil où rien ne revient se lit comme une panne. */
  erreur: string | null;
  mission_id: number | null;
  cree_le: string;
}

export type GenreFil = "MEMBRE" | "COLLABORATEUR";

export interface Fil {
  id: number;
  sujet: string;
  genre: GenreFil;
  cree_par: number;
  cree_le: string;
  dernier_message_le: string;
  participants: Personne[];
  apercu: string;
  non_lu: boolean;
  /** Un collaborateur travaille : l'écran dit « réfléchit… » plutôt que de
   *  laisser un silence qu'on prendrait pour une réponse perdue. */
  en_cours: boolean;
}

export interface FilDetail extends Fil {
  messages: MessageFil[];
}

export interface ListeFils {
  items: Fil[];
  total: number;
}

export interface Resume {
  membres: number;
  collaborateurs: number;
  notifications: number;
  total: number;
}
