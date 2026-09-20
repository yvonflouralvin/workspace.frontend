"use client";

import { createContext, useContext } from "react";
import type { PortailTache } from "@/lib/bfm-portail-api";

export interface PortailTacheContextValue {
  tache: PortailTache;
  avancer: (statut: PortailTache["statut"]) => Promise<void>;
  erreur: string | null;
}

const Contexte = createContext<PortailTacheContextValue | null>(null);

export const PortailTacheProvider = Contexte.Provider;

export function usePortailTache(): PortailTacheContextValue {
  const value = useContext(Contexte);
  if (!value) throw new Error("usePortailTache doit être utilisé dans le layout d'une tâche du portail");
  return value;
}
