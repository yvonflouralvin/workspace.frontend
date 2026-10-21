"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_PAR_DEFAUT,
  ErreurAssistant,
  archiverConversation,
  envoyerMessage,
  joindrePiece,
  lireConversation,
  lireFlux,
  listerConversations,
  ouvrirConversation,
} from "../api/client";
import type {
  Conversation,
  MessageAssistant,
  PieceEnAttente,
  PieceJointe,
} from "../types";

/** Le plafond du service (10 Mo). Vérifié ici pour le dire TOUT DE SUITE : le
 *  téléversement n'a lieu qu'à l'envoi, et laisser filer un fichier trop gros
 *  ferait échouer le message entier après que la question soit partie. */
export const PIECE_MAX_OCTETS = 10 * 1024 * 1024;
export const PIECES_MAX = 5;

export interface EtatAssistant {
  conversations: Conversation[];
  courante: number | null;
  messages: MessageAssistant[];
  /** Texte en cours d'arrivée, hors `messages` tant qu'il n'est pas complet. */
  enCours: string | null;
  chargement: boolean;
  erreur: string | null;
  /** Vrai quand l'échec vient de l'abonnement et non de la demande. */
  abonnementManquant: boolean;
  /** Fichiers choisis, pas encore téléversés — ils le seront à l'envoi. */
  enAttente: PieceEnAttente[];
  joindre: (fichiers: FileList | File[]) => void;
  retirer: (cle: string) => void;
  envoyer: (texte: string) => Promise<void>;
  interrompre: () => void;
  nouvelle: () => Promise<void>;
  choisir: (id: number) => Promise<void>;
  archiver: (id: number) => Promise<void>;
}

/** Identifiants négatifs pour les messages optimistes : l'id réel vient du
 *  serveur à la relecture, et deux clés React ne doivent jamais se croiser. */
let provisoire = 0;

export function useAssistant(application: string, base = BASE_PAR_DEFAUT): EtatAssistant {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [courante, setCourante] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageAssistant[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [abonnementManquant, setAbonnementManquant] = useState(false);
  const [enAttente, setEnAttente] = useState<PieceEnAttente[]>([]);
  const avorteur = useRef<AbortController | null>(null);
  // La conversation affichée AU MOMENT où le flux se termine. Sans elle, une
  // réponse qui finit d'arriver après un changement de fil s'afficherait sous
  // le mauvais : elle est enregistrée du bon côté, mais lue du mauvais.
  const couranteRef = useRef<number | null>(null);

  useEffect(() => {
    couranteRef.current = courante;
  }, [courante]);

  const rafraichirListe = useCallback(async () => {
    try {
      setConversations(await listerConversations(base));
    } catch {
      // La liste est un confort ; son échec ne doit pas fermer l'assistant.
    }
  }, [base]);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const liste = await listerConversations(base);
        if (!vivant) return;
        setConversations(liste);
        const derniere = liste[0];
        if (derniere) {
          const detail = await lireConversation(derniere.id, base);
          if (!vivant) return;
          setCourante(detail.id);
          setMessages(detail.messages);
        }
      } catch (e) {
        if (vivant) setErreur(e instanceof Error ? e.message : "Assistant indisponible");
      } finally {
        if (vivant) setChargement(false);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [base]);

  // Un flux laissé ouvert continue d'écrire dans un composant démonté.
  useEffect(() => () => avorteur.current?.abort(), []);

  const interrompre = useCallback(() => {
    avorteur.current?.abort();
    avorteur.current = null;
    setEnCours(null);
  }, []);

  const joindre = useCallback((fichiers: FileList | File[]) => {
    const choisis = Array.from(fichiers);
    setErreur(null);
    setEnAttente((liste) => {
      const retenus = [...liste];
      for (const fichier of choisis) {
        if (retenus.length >= PIECES_MAX) {
          setErreur(`Au plus ${PIECES_MAX} fichiers par message.`);
          break;
        }
        if (fichier.size === 0) {
          setErreur(`« ${fichier.name} » est vide.`);
          continue;
        }
        if (fichier.size > PIECE_MAX_OCTETS) {
          setErreur(`« ${fichier.name} » dépasse 10 Mo.`);
          continue;
        }
        retenus.push({ cle: `${fichier.name}-${fichier.size}-${++provisoire}`, fichier });
      }
      return retenus;
    });
  }, []);

  const retirer = useCallback((cle: string) => {
    setEnAttente((liste) => liste.filter((p) => p.cle !== cle));
  }, []);

  const nouvelle = useCallback(async () => {
    interrompre();
    setEnAttente([]);
    setErreur(null);
    setAbonnementManquant(false);
    setMessages([]);
    setCourante(null);
  }, [interrompre]);

  const choisir = useCallback(
    async (id: number) => {
      interrompre();
      setErreur(null);
      setAbonnementManquant(false);
      setEnAttente([]);
      try {
        const detail = await lireConversation(id, base);
        setCourante(detail.id);
        setMessages(detail.messages);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Conversation illisible");
      }
    },
    [base, interrompre]
  );

  const archiver = useCallback(
    async (id: number) => {
      await archiverConversation(id, base);
      setConversations((liste) => liste.filter((c) => c.id !== id));
      if (id === courante) {
        setCourante(null);
        setMessages([]);
      }
    },
    [base, courante]
  );

  const envoyer = useCallback(
    async (texte: string) => {
      const contenu = texte.trim();
      if (!contenu || enCours !== null) return;

      setErreur(null);
      setAbonnementManquant(false);

      let id = courante;
      try {
        // La conversation n'est créée qu'au premier message : ouvrir le panneau
        // ne doit pas laisser une coquille vide dans l'historique.
        if (id === null) {
          const detail = await ouvrirConversation(base);
          id = detail.id;
          setCourante(id);
        }
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Impossible d'ouvrir la conversation");
        return;
      }

      // Téléversement MAINTENANT, et pas au moment du choix : il faut un
      // identifiant de conversation, et la conversation n'est créée qu'ici.
      // Si une pièce échoue, rien ne part — une question qui porte sur un
      // fichier absent reçoit une réponse inventée.
      let jointes: PieceJointe[] = [];
      if (enAttente.length > 0) {
        setEnCours("");
        try {
          jointes = [];
          for (const attente of enAttente) {
            jointes.push(await joindrePiece(id, attente.fichier, base));
          }
        } catch (e) {
          setEnCours(null);
          setErreur(e instanceof Error ? e.message : "Le fichier n'a pas pu être joint");
          if (e instanceof ErreurAssistant) setAbonnementManquant(e.abonnementManquant);
          return;
        }
      }
      setEnAttente([]);

      setMessages((liste) => [
        ...liste,
        {
          id: --provisoire,
          role: "MEMBRE",
          contenu,
          erreur: null,
          cree_le: new Date().toISOString(),
          pieces: jointes,
        },
      ]);
      setEnCours("");

      const controleur = new AbortController();
      avorteur.current = controleur;
      let accumule = "";
      let echec: string | null = null;
      const rendues: PieceJointe[] = [];

      try {
        const reponse = await envoyerMessage(
          id,
          contenu,
          application,
          jointes.map((p) => p.document_id),
          controleur.signal,
          base
        );
        for await (const evenement of lireFlux(reponse)) {
          if (evenement.nom === "texte" && evenement.charge.delta) {
            accumule += evenement.charge.delta;
            setEnCours(accumule);
          } else if (evenement.nom === "piece" && evenement.charge.document_id) {
            rendues.push({
              document_id: evenement.charge.document_id,
              nom: evenement.charge.nom ?? "fichier",
              type_mime: evenement.charge.type_mime ?? "application/octet-stream",
              taille: evenement.charge.taille ?? 0,
              origine: "AGENT",
            });
          } else if (evenement.nom === "erreur") {
            echec = evenement.charge.message ?? "L'assistant n'a pas pu répondre";
            if (evenement.charge.abonnement) setAbonnementManquant(true);
          }
        }
      } catch (e) {
        if (controleur.signal.aborted) {
          // Interruption volontaire : ce qui est arrivé reste affiché.
        } else if (e instanceof ErreurAssistant) {
          echec = e.message;
          setAbonnementManquant(e.abonnementManquant);
        } else {
          echec = e instanceof Error ? e.message : "L'assistant n'a pas pu répondre";
        }
      } finally {
        avorteur.current = null;
      }

      setEnCours(null);
      const memeFil = couranteRef.current === id;
      if (memeFil && (accumule || echec || rendues.length > 0)) {
        setMessages((liste) => [
          ...liste,
          {
            id: --provisoire,
            role: "AGENT",
            contenu: accumule,
            erreur: echec,
            cree_le: new Date().toISOString(),
            pieces: rendues,
          },
        ]);
      }
      if (memeFil && echec) setErreur(echec);
      void rafraichirListe();
    },
    [application, base, courante, enAttente, enCours, rafraichirListe]
  );

  return {
    conversations,
    courante,
    messages,
    enCours,
    chargement,
    erreur,
    abonnementManquant,
    enAttente,
    joindre,
    retirer,
    envoyer,
    interrompre,
    nouvelle,
    choisir,
    archiver,
  };
}
