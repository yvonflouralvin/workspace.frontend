import type { ReactNode } from "react";

/** LE CADRE DE FENÊTRE AUTOUR D'UNE CAPTURE.
 *
 *  Une capture posée nue sur une page ressemble à une image de stock. Le même
 *  pixel dans un cadre de fenêtre devient un LOGICIEL : on sait au premier
 *  coup d'œil qu'on regarde un écran, pas une illustration.
 *
 *  La barre du haut ne copie aucun navigateur en particulier — trois pastilles
 *  et rien d'autre. Reproduire une barre d'adresse obligerait à y écrire une
 *  adresse, donc à promettre un domaine, et à le tenir.
 *
 *  `sombre` existe parce que le cadre vit dans les deux registres du site : sur
 *  fond clair il lui faut un filet discret et une ombre portée ; sur fond
 *  sombre, l'ombre ne se voit pas et c'est le filet qui doit porter le relief.
 */
export function Fenetre({
  children,
  sombre = false,
  className = "",
}: {
  children: ReactNode;
  sombre?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${
        sombre
          ? "border border-[color:var(--nuit-filet)] bg-[color:var(--nuit-carte)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]"
          : "border border-outline-soft bg-surface-container-lowest shadow-[0_24px_60px_-24px_rgba(11,28,48,0.28)]"
      } ${className}`}
    >
      <div
        className={`flex items-center gap-xs px-md py-sm ${
          sombre
            ? "border-b border-[color:var(--nuit-filet)] bg-[color:var(--nuit-elevee)]"
            : "border-b border-outline-soft bg-surface-container-low"
        }`}
        aria-hidden="true"
      >
        {["#ef6a5e", "#f5bf4f", "#61c454"].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
        ))}
      </div>
      {children}
    </div>
  );
}
