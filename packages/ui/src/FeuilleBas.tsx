"use client";

import { CloseOutlined } from "@mui/icons-material";

/** Une feuille qui monte du bas de l'écran.
 *
 *  L'équivalent mobile du tiroir de droite : sur un téléphone, un panneau
 *  latéral n'a pas la largeur de s'ouvrir, et un tableau qui déborde oblige à
 *  faire défiler horizontalement pour atteindre un bouton — geste qu'on ne
 *  découvre pas tout seul.
 *
 *  Le contenu défile à l'intérieur ; la feuille ne dépasse jamais 85 % de la
 *  hauteur, pour qu'il reste toujours de quoi voir ce qu'il y a derrière et
 *  comprendre qu'on peut refermer.
 */
export function FeuilleBas({
  titre,
  sousTitre,
  onClose,
  children,
  actions,
}: {
  titre: string;
  sousTitre?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Rendu collé en bas, hors de la zone qui défile. */
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-surface-container-lowest shadow-drawer animate-drawer-in sm:max-w-[32rem] sm:rounded-b-2xl sm:mb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
      >
        {/* La poignée : elle dit « ça se referme » sans qu'on ait à l'écrire. */}
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        <header className="flex items-start justify-between gap-3 border-b border-outline-soft px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-body-lg font-medium text-on-surface">{titre}</h2>
            {sousTitre && (
              <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">{sousTitre}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <CloseOutlined style={{ fontSize: 18 }} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {actions && (
          <footer className="border-t border-outline-soft px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {actions}
          </footer>
        )}
      </div>
    </div>
  );
}
