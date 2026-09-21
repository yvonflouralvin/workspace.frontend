"use client";

import { createContext, useContext } from "react";
import type { Phase, Tache } from "@/lib/bfm-missions-api";

export type EtatSauvegarde = "idle" | "saving" | "saved" | "error";

export interface PhaseContextValue {
  phase: Phase;
  /** Les tâches de CETTE phase (le contexte de la mission porte celles de toutes). */
  taches: Tache[];
  enregistrer: (patch: Partial<Phase>) => Promise<void>;
  etat: EtatSauvegarde;
  /** Pourquoi le dernier enregistrement a échoué — l'icône seule ne le dit pas. */
  erreur: string | null;
}

const PhaseContext = createContext<PhaseContextValue | null>(null);

export const PhaseProvider = PhaseContext.Provider;

export function usePhase(): PhaseContextValue {
  const value = useContext(PhaseContext);
  if (!value) throw new Error("usePhase doit être utilisé dans le layout d'une phase");
  return value;
}
