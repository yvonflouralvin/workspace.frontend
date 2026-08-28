"use client";

import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { AccueilApp } from "@repo/ui/shell/AccueilApp";

import { DashboardShell, NAV_ITEMS } from "@/components/DashboardShell";

/** La porte d'entrée d'Operations.
 *
 *  Elle renvoyait sur `/plannings` sans condition. Or un groupe peut faire
 *  d'Operations sa page de démarrage sans donner les droits du planning : le
 *  membre atterrissait alors sur un 403 juste après s'être connecté. On envoie
 *  désormais vers le premier module qui lui est ouvert.
 */
export default function AccueilPage() {
  const loading = useSessionStore((s) => s.loading);
  const accueil = useSessionStore((s) => s.accueil);
  const prenom = useSessionStore((s) => s.user?.username);
  const { can } = usePermissions();

  return (
    <DashboardShell>
      <AccueilApp items={NAV_ITEMS} can={can} appName="Operations"
          accueil={accueil}
          prenom={prenom} pret={!loading} />
    </DashboardShell>
  );
}
