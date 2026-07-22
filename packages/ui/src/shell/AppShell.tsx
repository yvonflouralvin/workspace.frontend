"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface ShellContextValue {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellContextValue>({
  mobileNavOpen: false,
  setMobileNavOpen: () => {},
});

export function useShell() {
  return useContext(ShellContext);
}

/**
 * `auto` = la sidebar suit les breakpoints (rail en tablette, complète en desktop).
 * `expanded` = libellés toujours visibles — c'est le régime de l'off-canvas mobile,
 * où les variantes `lg:` ne s'appliquent pas alors qu'on veut la version complète.
 */
const SidebarModeContext = createContext<"auto" | "expanded">("auto");

export function useSidebarMode() {
  return useContext(SidebarModeContext);
}

/** Classe à appliquer aux éléments que le rail masque (libellés, badges, chevrons). */
export function useCollapsibleClass(): string {
  return useSidebarMode() === "expanded" ? "" : "hidden lg:inline-flex";
}

interface AppShellProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
}

/**
 * Trois régimes de navigation :
 * - mobile (< md)  : sidebar en off-canvas, ouverte par le hamburger de la TopBar ;
 * - tablette (md)  : rail d'icônes de 72 px ;
 * - desktop (lg+)  : sidebar complète de 260 px.
 */
export function AppShell({ sidebar, topBar, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Fermer au changement de page : cliquer un lien de la sidebar ne démonte pas
  // le shell, la navigation resterait ouverte par-dessus le contenu.
  useEffect(() => setMobileNavOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <ShellContext.Provider value={{ mobileNavOpen, setMobileNavOpen }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <aside className="hidden md:flex md:w-[72px] lg:w-[260px] flex-shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest transition-[width]">
          {sidebar}
        </aside>

        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-overlay animate-overlay-in"
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              className="relative w-[260px] max-w-[85vw] h-full bg-surface-container-lowest shadow-drawer animate-drawer-in"
            >
              <SidebarModeContext.Provider value="expanded">{sidebar}</SidebarModeContext.Provider>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <header className="flex-shrink-0 flex items-center h-[52px] md:h-14 border-b border-outline-variant bg-surface-container-lowest">
            {topBar}
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto bg-background">{children}</main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
