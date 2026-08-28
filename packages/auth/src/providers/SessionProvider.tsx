// packages/auth/providers/SessionProvider.tsx

"use client";

import { useEffect, useState } from "react";
import { surSessionExpiree } from "@repo/network/client";
import { createSessionStore, SessionStoreContext } from "../store/session.store.js";
import type { SessionResponse } from "../types/session.js";

const DOMAINE_AUTH =
  process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN ?? "http://localhost:3001";

// À quelle fréquence, au plus, on redemande la session pendant qu'un onglet
// reste ouvert. C'est ce battement qui fait GLISSER la fenêtre d'expiration :
// `auth` réémet le jeton, donc la durée court depuis la dernière activité et
// non depuis la connexion. Assez rare pour ne rien coûter, assez fréquent pour
// qu'un onglet laissé ouvert toute la journée ne s'éteigne pas.
const BATTEMENT_MS = 10 * 60 * 1000;

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: SessionResponse;
}) {
  const [store] = useState(() => createSessionStore(initialSession));

  useEffect(() => {
    if (!initialSession) {
      store.getState().loadSession();
    }
  }, []);

  useEffect(() => {
    // Une session expirée renvoie à la connexion, avec l'adresse courante en
    // mémoire : on revient là où l'on était, plutôt que sur un accueil
    // générique après avoir retapé son mot de passe.
    surSessionExpiree(() => {
      const retour = encodeURIComponent(window.location.href);
      window.location.href = `${DOMAINE_AUTH}/?retour=${retour}`;
    });

    // Le battement : chaque appel prolonge la session côté `auth`. On ne
    // sollicite rien quand l'onglet est caché — un onglet oublié en arrière-plan
    // n'est pas une activité, et le garder vivant indéfiniment viderait de son
    // sens la durée qu'on vient de fixer.
    function battre() {
      if (document.visibilityState === "visible") {
        store.getState().loadSession();
      }
    }

    const minuterie = window.setInterval(battre, BATTEMENT_MS);
    window.addEventListener("focus", battre);

    return () => {
      surSessionExpiree(null);
      window.clearInterval(minuterie);
      window.removeEventListener("focus", battre);
    };
  }, [store]);

  return (
    <SessionStoreContext.Provider value={store}>
      {children}
    </SessionStoreContext.Provider>
  );
}
