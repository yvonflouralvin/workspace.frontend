"use client";

import { createContext, useContext } from "react";
import type { PortailMoi } from "@/lib/bfm-portail-api";

const PortailContext = createContext<PortailMoi | null>(null);

export const PortailProvider = PortailContext.Provider;

export function usePortail(): PortailMoi {
  const value = useContext(PortailContext);
  if (!value) throw new Error("usePortail doit être utilisé dans le layout du portail");
  return value;
}
