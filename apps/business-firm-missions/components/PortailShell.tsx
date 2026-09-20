"use client";

import Link from "next/link";
import { AssignmentTurnedInOutlined, HomeOutlined, MenuOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { useLogout } from "@repo/auth/hooks/useLogout";
import { AppShell, useShell } from "@repo/ui/shell/AppShell";
import { Sidebar } from "@repo/ui/shell/Sidebar";
import { UserFooter } from "@repo/ui/shell/UserFooter";
import type { NavItem } from "@repo/ui/types/shell";

const COULEUR = "#7c2d12";

const NAV: NavItem[] = [
  { label: "Accueil", href: "/portail", icon: <HomeOutlined style={{ fontSize: 20 }} />, exact: true },
  { label: "Missions", href: "/portail/missions", icon: <AssignmentTurnedInOutlined style={{ fontSize: 20 }} /> },
];

function BarreHaute({ client }: { client: string | null }) {
  const { setMobileNavOpen } = useShell();
  return (
    <div className="flex w-full items-center gap-3 px-4 md:px-6">
      <button
        onClick={() => setMobileNavOpen(true)}
        aria-label="Ouvrir la navigation"
        className="md:hidden w-11 h-11 -ml-2 flex-none flex items-center justify-center rounded-lg text-on-surface-variant"
      >
        <MenuOutlined style={{ fontSize: 22 }} />
      </button>
      <Link href="/portail" className="min-w-0 truncate font-display text-[17px] font-semibold text-on-surface">
        Espace client
      </Link>
      {client && <span className="hidden sm:inline truncate text-body-sm text-outline">· {client}</span>}
    </div>
  );
}

/** L'habillage du portail des clients.
 *
 *  Volontairement réduit : pas de sélecteur de workspace, pas d'autres applications, pas de
 *  recherche globale — un client n'a accès à rien de tout cela, et un menu qui le lui laisserait
 *  croire ne mènerait qu'à des refus. */
export function PortailShell({ client, children }: { client: string | null; children: React.ReactNode }) {
  const { user } = useSessionStore();
  const handleLogout = useLogout("/api/auth/logout");
  const resume = user ? { id: user.id, username: user.username, email: user.email } : null;

  return (
    <AppShell
      sidebar={
        <Sidebar
          topSlot={
            <div className="flex items-center gap-2.5 px-1.5">
              <span
                className="w-9 h-9 flex-none rounded-[10px] flex items-center justify-center font-display text-body-md font-semibold"
                style={{ background: `color-mix(in srgb, ${COULEUR} 12%, transparent)`, color: COULEUR }}
              >
                B
              </span>
              <span className="hidden lg:block min-w-0 leading-tight">
                <span className="block text-label-md font-semibold text-on-surface truncate">Business Firm</span>
                <span className="block text-[11px] text-on-surface-variant truncate">{client ?? "Espace client"}</span>
              </span>
            </div>
          }
          navItems={NAV}
          bottomSlot={<UserFooter user={resume} onLogout={handleLogout} />}
        />
      }
      topBar={<BarreHaute client={client} />}
    >
      {children}
    </AppShell>
  );
}
