"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Les quatre vues de la console partagent la même barre : c'est la même donnée
 * regardée sous quatre angles, pas quatre écrans indépendants.
 */
const TABS = [
  { href: "/", label: "Mes demandes", exact: true },
  { href: "/requests", label: "À traiter" },
  { href: "/submissions", label: "Soumissions" },
  { href: "/flows", label: "Flux" },
];

export function ConsoleTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-outline-soft overflow-x-auto mb-5">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
