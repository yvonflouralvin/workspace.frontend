"use client";

import { createContext, useContext } from "react";
import type { Deliverable, DeliverableApprovers, Phase } from "@/app/lib/projects-api";

export interface DeliverableContextValue {
  deliverable: Deliverable;
  /** Phase porteuse — son mode décide du rattachement possible. */
  phase: Phase | null;
  approvers: DeliverableApprovers | null;
  reload: () => Promise<void>;
  canManage: boolean;
}

const DeliverableContext = createContext<DeliverableContextValue | null>(null);

export const DeliverableProvider = DeliverableContext.Provider;

export function useDeliverable(): DeliverableContextValue {
  const value = useContext(DeliverableContext);
  if (!value) throw new Error("useDeliverable doit être utilisé dans le layout d'un livrable");
  return value;
}
