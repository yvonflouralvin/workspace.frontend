"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFacturationConfig, type DeviseEntry } from "@/lib/ventes-api";

interface DeviseContextValue {
  /** Code de la devise d'affichage courante. */
  code: string;
  /** Devise de base du workspace — celle dans laquelle les montants sont stockés. */
  base: string;
  options: string[];
  setCode: (code: string) => void;
  /** Formate un montant exprimé en devise de base vers la devise d'affichage. */
  format: (value: string | number | null | undefined) => string;
}

const DeviseContext = createContext<DeviseContextValue | null>(null);

const STORAGE_KEY = "ventes.devise";

export function useDevise(): DeviseContextValue {
  const ctx = useContext(DeviseContext);
  if (!ctx) throw new Error("useDevise doit être utilisé dans DeviseProvider");
  return ctx;
}

export function DeviseProvider({ children }: { children: React.ReactNode }) {
  const [base, setBase] = useState("FC");
  const [devises, setDevises] = useState<DeviseEntry[]>([]);
  const [code, setCodeState] = useState("FC");

  useEffect(() => {
    getFacturationConfig()
      .then((c) => {
        setBase(c.devise_base);
        setDevises(c.devises ?? []);
        // La préférence d'affichage est locale à l'utilisateur, pas au workspace.
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        const valid = stored && [c.devise_base, ...(c.devises ?? []).map((d) => d.code)].includes(stored);
        setCodeState(valid ? stored! : c.devise_base);
      })
      .catch(() => {});
  }, []);

  const setCode = useCallback((next: string) => {
    setCodeState(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const format = useCallback(
    (value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === "") return "—";
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) return "—";
      const taux = code === base ? 1 : Number(devises.find((d) => d.code === code)?.taux ?? 1);
      const converti = n * taux;
      return `${converti.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${code}`;
    },
    [code, base, devises]
  );

  const value = useMemo(
    () => ({ code, base, options: [base, ...devises.map((d) => d.code)], setCode, format }),
    [code, base, devises, setCode, format]
  );

  return <DeviseContext.Provider value={value}>{children}</DeviseContext.Provider>;
}

/** Sélecteur posé dans la TopBar : il reformate tous les montants de l'app. */
export function DeviseSelector() {
  const { code, options, setCode } = useDevise();
  if (options.length < 2) return null;
  return (
    <label className="inline-flex items-center h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-2">
      <span className="sr-only">Devise d&apos;affichage</span>
      <select
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="bg-transparent text-body-sm font-semibold text-on-surface outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
