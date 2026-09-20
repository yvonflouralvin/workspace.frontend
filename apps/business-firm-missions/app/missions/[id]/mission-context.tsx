"use client";

import { createContext, useContext } from "react";
import type { Mission, Phase, Tache } from "@/lib/bfm-missions-api";
import type { Membre } from "@/lib/membres-api";

export interface MissionContextValue {
  missionId: number;
  mission: Mission;
  setMission: (mission: Mission) => void;
  phases: Phase[];
  taches: Tache[];
  /** Membres du workspace — la source de tout choix de personne du module. */
  membres: Membre[];
  reload: () => Promise<void>;
}

const MissionContext = createContext<MissionContextValue | null>(null);

export const MissionProvider = MissionContext.Provider;

export function useMission(): MissionContextValue {
  const value = useContext(MissionContext);
  if (!value) throw new Error("useMission doit être utilisé dans le layout d'une mission");
  return value;
}
