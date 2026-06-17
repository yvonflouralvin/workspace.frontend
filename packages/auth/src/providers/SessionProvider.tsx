// packages/auth/providers/SessionProvider.tsx

"use client";

import { useEffect, useState } from "react";
import { createSessionStore, SessionStoreContext } from "../store/session.store.js";
import type { SessionResponse } from "../types/session.js";

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

  return (
    <SessionStoreContext.Provider value={store}>
      {children}
    </SessionStoreContext.Provider>
  );
}
