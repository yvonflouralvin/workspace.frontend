// packages/auth/providers/SessionProvider.tsx

"use client";

import { useEffect} from "react";
import { useSessionStore} from "../store/session.store.js";

export function SessionProvider({children,}: {children:React.ReactNode;}) {

  const loadSession = useSessionStore((state) => state.loadSession);
  useEffect(() => {loadSession();}, []);

  return children;
}