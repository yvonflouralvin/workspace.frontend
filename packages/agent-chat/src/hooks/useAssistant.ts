"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BASE_PAR_DEFAUT,
  ErreurAssistant,
  archiverConversation,
  envoyerMessage,
  lireConversation,
  lireFlux,
  listerConversations,
  ouvrirConversation,
} from "../api/client";
import type { Conversation, MessageAssistant } from "../types";

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
  const avorteur = useRef<AbortController | null>(null);

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

  const nouvelle = useCallback(async () => {
    setErreur(null);
    setAbonnementManquant(false);
    setMessages([]);
    setCourante(null);
  }, []);

  const choisir = useCallback(
    async (id: number) => {
      setErreur(null);
      setAbonnementManquant(false);
      try {
        const detail = await lireConversation(id, base);
        setCourante(detail.id);
        setMessages(detail.messages);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Conversation illisible");
      }
    },
    [base]
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

  const interrompre = useCallback(() => {
    avorteur.current?.abort();
    avorteur.current = null;
    setEnCours(null);
  }, []);

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

      setMessages((liste) => [
        ...liste,
        {
          id: --provisoire,
          role: "MEMBRE",
          contenu,
          erreur: null,
          cree_le: new Date().toISOString(),
        },
      ]);
      setEnCours("");

      const controleur = new AbortController();
      avorteur.current = controleur;
      let accumule = "";
      let echec: string | null = null;

      try {
        const reponse = await envoyerMessage(id, contenu, application, controleur.signal, base);
        for await (const evenement of lireFlux(reponse)) {
          if (evenement.nom === "texte" && evenement.charge.delta) {
            accumule += evenement.charge.delta;
            setEnCours(accumule);
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
      if (accumule || echec) {
        setMessages((liste) => [
          ...liste,
          {
            id: --provisoire,
            role: "AGENT",
            contenu: accumule,
            erreur: echec,
            cree_le: new Date().toISOString(),
          },
        ]);
      }
      if (echec) setErreur(echec);
      void rafraichirListe();
    },
    [application, base, courante, enCours, rafraichirListe]
  );

  return {
    conversations,
    courante,
    messages,
    enCours,
    chargement,
    erreur,
    abonnementManquant,
    envoyer,
    interrompre,
    nouvelle,
    choisir,
    archiver,
  };
}
