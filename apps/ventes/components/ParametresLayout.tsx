"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PaidOutlined,
  PercentOutlined,
  BusinessOutlined,
  PhoneAndroidOutlined,
} from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";

/**
 * Les trois réglages partagent une colonne de navigation : la maquette en fait
 * une seule page à deux colonnes, pas un index qui envoie vers trois écrans.
 * Chaque réglage garde sa route, donc reste partageable.
 */
const SECTIONS = [
  { href: "/parametres/devise", label: "Devises", icon: <PaidOutlined style={{ fontSize: 18 }} /> },
  { href: "/parametres/tva", label: "TVA", icon: <PercentOutlined style={{ fontSize: 18 }} /> },
  {
    href: "/parametres/organisation",
    label: "Organisation",
    icon: <BusinessOutlined style={{ fontSize: 18 }} />,
  },
  {
    href: "/parametres/mobile",
    label: "Application mobile",
    icon: <PhoneAndroidOutlined style={{ fontSize: 18 }} />,
  },
];

export function ParametresLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
        <div className="hidden md:block mb-6">
          <h1 className="font-display text-headline-md text-on-surface">Paramètres</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Devises, TVA, identité de l&apos;établissement et application mobile.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-6 items-start">
          <nav className="rounded-xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            {SECTIONS.map((s) => {
              const active = pathname.startsWith(s.href);
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`flex items-center gap-2.5 px-3.5 py-3 border-b border-hairline last:border-b-0 text-body-sm transition-colors ${
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "font-medium text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span
                    className={`w-[18px] h-[18px] inline-flex items-center justify-center ${
                      active ? "text-primary" : "text-outline"
                    }`}
                  >
                    {s.icon}
                  </span>
                  {s.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
            {children}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
