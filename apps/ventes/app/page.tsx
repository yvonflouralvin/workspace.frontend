"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { AccueilApp } from "@repo/ui/shell/AccueilApp";

import { DashboardShell, NAV_ITEMS } from "@/components/DashboardShell";

/** La porte d'entrée de Facturation.
 *
 *  Elle renvoyait sur `/clients` sans condition : un comptable qui ne voit que
 *  les factures atterrissait sur un 403. On envoie vers le premier module qui
 *  lui est ouvert.
 */
export default function Home() {
  const loading = useSessionStore((s) => s.loading);
  const { can } = usePermissions();

  return (
    <DashboardShell>
      <AccueilApp items={NAV_ITEMS} can={can} appName="Facturation" pret={!loading} />
    </DashboardShell>
  );
}
