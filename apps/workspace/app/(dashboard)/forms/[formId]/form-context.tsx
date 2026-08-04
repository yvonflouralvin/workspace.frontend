"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Formulaire } from "@/app/lib/forms-api";

interface Contexte {
  forme: Formulaire;
  recharger: () => Promise<Formulaire | null>;
  setForme: (forme: Formulaire) => void;
}

const FormulaireContext = createContext<Contexte | null>(null);

export function FormulaireProvider({
  value,
  children,
}: {
  value: Contexte;
  children: ReactNode;
}) {
  return <FormulaireContext.Provider value={value}>{children}</FormulaireContext.Provider>;
}

export function useFormulaire(): Contexte {
  const contexte = useContext(FormulaireContext);
  if (!contexte) throw new Error("useFormulaire hors de son layout");
  return contexte;
}
