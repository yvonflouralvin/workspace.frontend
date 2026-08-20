"use client";

import { createContext, useContext } from "react";
import type { Promotion, SessionEvaluation } from "@/app/lib/api";

export interface PromotionContexte {
  promotionId: number;
  promotion: Promotion | null;
  sessions: SessionEvaluation[];
  /** La session d'évaluation choisie dans l'en-tête — partagée par la cotation,
   *  les examens, la grille et les recours : chacun la redemanderait sinon, et
   *  l'agent la reposerait à chaque onglet. */
  session: string;
  setSession: (s: string) => void;
  etablissementId: number | null;
  recharger: () => void;
}

const Contexte = createContext<PromotionContexte | null>(null);

export const PromotionProvider = Contexte.Provider;

export function usePromotion(): PromotionContexte {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error("usePromotion doit être utilisé dans le layout d'une promotion");
  return valeur;
}
