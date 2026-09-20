"use client";

import { createContext, useContext } from "react";
import type { Phase, Tache } from "@/lib/bfm-missions-api";
import type { EtatSauvegarde } from "../../phase-context";

export interface TacheContextValue {
  tache: Tache;
  phase: Phase;
  enregistrer: (patch: Partial<Tache>) => Promise<void>;
  etat: EtatSauvegarde;
  /** Pourquoi le dernier enregistrement a échoué — l'icône seule ne le dit pas. */
  erreur: string | null;
}

const TacheContext = createContext<TacheContextValue | null>(null);

export const TacheProvider = TacheContext.Provider;

export function useTache(): TacheContextValue {
  const value = useContext(TacheContext);
  if (!value) throw new Error("useTache doit être utilisé dans le layout d'une tâche");
  return value;
}
