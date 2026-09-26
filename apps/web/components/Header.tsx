"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuOutlined, CloseOutlined } from "@mui/icons-material";
import { navLinks, AUTH_APP_URL } from "./nav-links";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-outline-soft bg-surface-container-lowest/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-gutter py-md">
        <Link href="/" className="flex items-center gap-sm" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary font-display text-body-lg font-bold">
            S
          </span>
          <span className="font-display text-body-lg font-bold tracking-tight text-on-surface">
            Solution As A Service
          </span>
        </Link>

        <nav className="hidden items-center gap-lg md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-md text-on-surface-variant transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-sm md:flex">
          <a
            href={AUTH_APP_URL}
            className="rounded-lg px-md py-sm text-body-md text-on-surface-variant transition-colors hover:text-primary"
          >
            Se connecter
          </a>
          <a
            href={`${AUTH_APP_URL}/register`}
            className="rounded-lg bg-primary px-md py-sm text-body-md font-medium text-on-primary shadow-button transition-opacity hover:opacity-90"
          >
            Essayer gratuitement
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </div>

      {open && (
        <div className="border-t border-outline-soft bg-surface-container-lowest px-gutter py-md md:hidden">
          <nav className="flex flex-col gap-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-sm py-sm text-body-md text-on-surface-variant hover:bg-surface-container-low"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-sm flex flex-col gap-sm border-t border-outline-soft pt-sm">
              <a
                href={AUTH_APP_URL}
                className="rounded-lg px-sm py-sm text-center text-body-md text-on-surface-variant hover:bg-surface-container-low"
              >
                Se connecter
              </a>
              <a
                href={`${AUTH_APP_URL}/register`}
                className="rounded-lg bg-primary px-sm py-sm text-center text-body-md font-medium text-on-primary"
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
