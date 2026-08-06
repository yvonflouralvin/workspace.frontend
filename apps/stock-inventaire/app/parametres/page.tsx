"use client";

import { MobileAppBlock } from "@repo/ui/MobileAppBlock";
import { DashboardShell } from "@/components/DashboardShell";

// Cette application n'a pas de réglage propre côté serveur : la page ne porte
// donc que ce qui existe réellement. Y afficher des sections vides laisserait
// croire à des fonctionnalités absentes.
export default function ParametresPage() {
  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto flex flex-col gap-4">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Paramètres</h1>
          <p className="mt-0.5 max-w-[62ch] text-body-md text-on-surface-variant">
            Ce qui se règle depuis Stock.
          </p>
        </div>
        <MobileAppBlock appKey="stock" appLabel="Stock" />
      </div>
    </DashboardShell>
  );
}
