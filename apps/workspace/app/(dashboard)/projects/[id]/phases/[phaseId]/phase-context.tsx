"use client";

import { createContext, useContext } from "react";
import type { Phase } from "@/app/lib/projects-api";
import type { EchecSauvegarde } from "@/app/lib/autosave";

export type PhaseSaveState = "idle" | "saving" | "saved" | "error";

export interface PhaseContextValue {
  phase: Phase;
  /** Empile un patch et déclenche la sauvegarde différée (partagée avec l'en-tête). */
  queue: (patch: Partial<Phase>) => void;
  saveState: PhaseSaveState;
  /** Pourquoi le dernier enregistrement a échoué — l'indicateur seul ne le dit pas. */
  echec: EchecSauvegarde | null;
  oublierEchec: () => void;
  canManage: boolean;
}

const PhaseContext = createContext<PhaseContextValue | null>(null);

export const PhaseProvider = PhaseContext.Provider;

export function usePhase(): PhaseContextValue {
  const value = useContext(PhaseContext);
  if (!value) throw new Error("usePhase doit être utilisé dans le layout d'une phase");
  return value;
}
