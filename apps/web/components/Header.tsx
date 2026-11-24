"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MenuOutlined, CloseOutlined } from "@mui/icons-material";
import { navLinks, lienAuth } from "./nav-links";
import { Marque } from "./Marque";

/** LA BARRE DU HAUT, posée SUR le hero sombre puis détachée.
 *
 *  POURQUOI ELLE CHANGE AU DÉFILEMENT. En haut de page elle flotte sur le
 *  hero sombre : un fond opaque y dessinerait une bande qui coupe l'image en
 *  deux. Dès qu'on descend, le contenu qui passe dessous est clair, et une
 *  barre transparente rendrait les liens illisibles. Elle prend donc son
 *  fond et son filet à partir de huit pixels de défilement.
 *
 *  CONSÉQUENCE À NE PAS DÉFAIRE : toute page du site DOIT s'ouvrir sur le
 *  registre sombre. En haut de page, les liens de cette barre sont clairs ;
 *  une page qui commencerait par un fond clair les rendrait invisibles
 *  jusqu'au premier défilement, et le défaut ne se verrait pas en relisant
 *  le diff — il se verrait en arrivant sur la page. Le test
 *  `lib/__tests__/pages.test.ts` garde cette propriété pour les six pages.
 *
 *  `passive: true` sur l'écouteur : sans lui, le navigateur doit attendre de
 *  savoir si on va annuler l'évènement avant de défiler, et le défilement
 *  accroche. C'est le seul écouteur de défilement du site, et il ne fait que
 *  comparer un booléen.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const [detachee, setDetachee] = useState(false);

  useEffect(() => {
    const surDefilement = () => setDetachee(window.scrollY > 8);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);

  // Le menu ouvert ne doit pas laisser la page défiler derrière lui.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        detachee || open
          ? "border-b border-outline-soft bg-surface-container-lowest/85 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-md px-gutter py-md">
        <Link
          href="/"
          className="group flex items-center gap-sm"
          onClick={() => setOpen(false)}
        >
          <Marque className="h-9 w-9 shrink-0 transition-transform duration-300 group-hover:scale-105" sombre={!detachee && !open} />
          <span
            className={`font-display text-body-lg font-bold tracking-tight transition-colors ${
              detachee || open ? "text-on-surface" : "text-[color:var(--nuit-texte)]"
            }`}
          >
            Solution As A Service
          </span>
        </Link>

        <nav className="hidden items-center gap-xl md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative text-body-md transition-colors ${
                detachee
                  ? "text-on-surface-variant hover:text-primary"
                  : "text-[color:var(--nuit-texte-doux)] hover:text-[color:var(--nuit-texte)]"
              }`}
            >
              {link.label}
              {/* Le trait qui se déploie du centre : il dit où le pointeur
                  est, sans réserver la place d'un soulignement permanent. */}
              <span
                aria-hidden="true"
                className={`absolute -bottom-1 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full transition-all duration-300 group-hover:w-full ${
                  detachee ? "bg-primary" : "bg-[color:var(--color-secondary-fixed-dim)]"
                }`}
              />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-sm md:flex">
          <a
            href={lienAuth()}
            className={`rounded-lg px-md py-sm text-body-md transition-colors ${
              detachee
                ? "text-on-surface-variant hover:text-primary"
                : "text-[color:var(--nuit-texte-doux)] hover:text-[color:var(--nuit-texte)]"
            }`}
          >
            Se connecter
          </a>
          <a
            href={lienAuth("/register")}
            className="rounded-xl bg-primary px-md py-sm text-body-md font-semibold text-on-primary shadow-[0_1px_0_0_rgb(255_255_255_/_0.25)_inset,0_8px_24px_-10px_rgb(53_37_205_/_0.8)] transition-all duration-200 hover:-translate-y-0.5"
          >
            Essayer gratuitement
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors md:hidden ${
            detachee || open ? "text-on-surface" : "text-[color:var(--nuit-texte)]"
          }`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      {open && (
        <div className="animate-pop-in border-t border-outline-soft bg-surface-container-lowest px-gutter py-md md:hidden">
          <nav className="flex flex-col gap-xs">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-sm py-sm text-body-lg text-on-surface transition-colors hover:bg-surface-container-low"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-sm flex flex-col gap-sm border-t border-outline-soft pt-md">
              <a
                href={lienAuth()}
                className="rounded-xl border border-outline-soft px-sm py-sm text-center text-body-md text-on-surface"
              >
                Se connecter
              </a>
              <a
                href={lienAuth("/register")}
                className="rounded-xl bg-primary px-sm py-sm text-center text-body-md font-semibold text-on-primary"
              >
                Essayer gratuitement
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
