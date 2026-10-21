"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface ShellContextValue {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  /** Vrai quand la coquille a reçu un panneau d'assistant à héberger. */
  assistantDisponible: boolean;
  assistantOuvert: boolean;
  setAssistantOuvert: (open: boolean) => void;
}

const ShellContext = createContext<ShellContextValue>({
  mobileNavOpen: false,
  setMobileNavOpen: () => {},
  assistantDisponible: false,
  assistantOuvert: false,
  setAssistantOuvert: () => {},
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
  /**
   * Panneau de l'assistant. Fourni, il fait apparaître son bouton dans la
   * TopBar et se loge À CÔTÉ du contenu sur grand écran — pas par-dessus.
   *
   * C'est le choix de fond : on parle à l'assistant DE ce qu'on a sous les
   * yeux. Un tiroir flottant couvrirait précisément l'écran dont il est
   * question, et une fenêtre surgissante est trop étroite pour une
   * conversation. En dessous de 1280 px il n'y a plus la place de tenir les
   * deux : le panneau redevient un tiroir, parce qu'un contenu réduit à 300 px
   * ne se lit plus.
   */
  assistant?: ReactNode;
}

const CLE_LARGEUR = "wd.assistant.largeur";
const CLE_OUVERT = "wd.assistant.ouvert";
const LARGEUR_DEFAUT = 400;
const LARGEUR_MIN = 320;
const LARGEUR_MAX = 640;

/**
 * Trois régimes de navigation :
 * - mobile (< md)  : sidebar en off-canvas, ouverte par le hamburger de la TopBar ;
 * - tablette (md)  : rail d'icônes de 72 px ;
 * - desktop (lg+)  : sidebar complète de 260 px.
 */
export function AppShell({ sidebar, topBar, children, assistant }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [assistantOuvert, setAssistantOuvert] = useState(false);
  const [largeur, setLargeur] = useState(LARGEUR_DEFAUT);
  const [redimensionne, setRedimensionne] = useState(false);
  const [largeEcran, setLargeEcran] = useState(false);
  const pathname = usePathname();

  // Fermer au changement de page : cliquer un lien de la sidebar ne démonte pas
  // le shell, la navigation resterait ouverte par-dessus le contenu.
  useEffect(() => setMobileNavOpen(false), [pathname]);

  // En dessous de ce seuil, contenu et panneau ne tiennent plus côte à côte :
  // le panneau redevient un tiroir. Suivi en JS et non en CSS parce qu'il faut
  // choisir QUEL arbre monter — deux copies du panneau tiendraient deux
  // conversations.
  useEffect(() => {
    if (!assistant) return;
    const requete = window.matchMedia("(min-width: 1280px)");
    const suivre = () => setLargeEcran(requete.matches);
    suivre();
    requete.addEventListener("change", suivre);
    return () => requete.removeEventListener("change", suivre);
  }, [assistant]);

  // Lecture APRÈS montage : le serveur ne connaît pas le stockage local, et un
  // panneau rendu ouvert côté serveur puis fermé côté client déclencherait une
  // erreur d'hydratation à chaque chargement.
  useEffect(() => {
    if (!assistant) return;
    try {
      const l = Number(window.localStorage.getItem(CLE_LARGEUR));
      if (l >= LARGEUR_MIN && l <= LARGEUR_MAX) setLargeur(l);
      // L'assistant reste ouvert d'une app à l'autre : passer de Ventes à
      // Comptabilité est une navigation complète, et refermer le panneau à
      // chaque fois ferait mentir « joignable depuis partout ».
      setAssistantOuvert(window.localStorage.getItem(CLE_OUVERT) === "1");
    } catch {
      // Navigation privée, stockage refusé : les valeurs par défaut suffisent.
    }
  }, [assistant]);

  const basculer = useCallback((ouvert: boolean) => {
    setAssistantOuvert(ouvert);
    try {
      window.localStorage.setItem(CLE_OUVERT, ouvert ? "1" : "0");
    } catch {
      // Sans mémoire, l'assistant se rouvre à la main. Rien de plus.
    }
  }, []);

  useEffect(() => {
    if (!mobileNavOpen && !assistantOuvert) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (mobileNavOpen) setMobileNavOpen(false);
      else basculer(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, assistantOuvert, basculer]);

  return (
    <ShellContext.Provider
      value={{
        mobileNavOpen,
        setMobileNavOpen,
        assistantDisponible: Boolean(assistant),
        assistantOuvert,
        setAssistantOuvert: basculer,
      }}
    >
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

        {/* UNE SEULE instance montée, jamais deux rendus que le CSS masquerait
            tour à tour : le panneau tient une conversation et un flux ouvert,
            un double montage les mènerait en double. */}
        {assistant && assistantOuvert && (
          largeEcran ? (
            <aside
              className="relative flex flex-none flex-col border-l border-outline-variant"
              style={{ width: largeur }}
            >
              <PoigneeLargeur
                largeur={largeur}
                setLargeur={setLargeur}
                setRedimensionne={setRedimensionne}
              />
              <div className="flex-1 min-h-0">{assistant}</div>
            </aside>
          ) : (
            <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
              <div
                className="absolute inset-0 bg-overlay animate-overlay-in"
                onClick={() => basculer(false)}
              />
              <div className="relative w-[420px] max-w-full h-full bg-surface-container-lowest shadow-drawer animate-drawer-in">
                {assistant}
              </div>
            </div>
          )
        )}

        {/* Pendant le glissé, un voile transparent capte la souris : sans lui,
            elle entre dans l'iframe ou le texte du contenu et le glissé saute. */}
        {redimensionne && <div className="fixed inset-0 z-[60] cursor-col-resize" />}
      </div>
    </ShellContext.Provider>
  );
}

function PoigneeLargeur({
  largeur,
  setLargeur,
  setRedimensionne,
}: {
  largeur: number;
  setLargeur: (l: number) => void;
  setRedimensionne: (v: boolean) => void;
}) {
  const depart = useRef<{ x: number; largeur: number } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!depart.current) return;
      const suivante = Math.min(
        LARGEUR_MAX,
        Math.max(LARGEUR_MIN, depart.current.largeur + (depart.current.x - e.clientX))
      );
      setLargeur(suivante);
    }
    function onUp() {
      if (!depart.current) return;
      depart.current = null;
      setRedimensionne(false);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [setLargeur, setRedimensionne]);

  // La largeur ne s'enregistre qu'une fois le glissé terminé : écrire à chaque
  // pixel ferait des centaines d'écritures pour un seul geste.
  useEffect(() => {
    if (depart.current) return;
    try {
      window.localStorage.setItem(CLE_LARGEUR, String(largeur));
    } catch {
      // Sans mémoire, la largeur repart du défaut au prochain chargement.
    }
  }, [largeur]);

  return (
    <div
      onMouseDown={(e) => {
        depart.current = { x: e.clientX, largeur };
        setRedimensionne(true);
      }}
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner l'assistant"
      className="absolute left-0 top-0 h-full w-1 -ml-0.5 cursor-col-resize hover:bg-primary/30 transition-colors z-10"
    />
  );
}
