"use client";

import { MobileAppBlock } from "@repo/ui/MobileAppBlock";
import { DashboardShell } from "@/components/DashboardShell";

export default function ParametresPage() {
  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1024px] flex-col gap-4 p-4 md:p-8">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Paramètres</h1>
          <p className="mt-0.5 max-w-[62ch] text-body-md text-on-surface-variant">
            Ce qui se règle depuis Operations.
          </p>
        </div>
        <MobileAppBlock appKey="operations" appLabel="Operations" />
      </div>
    </DashboardShell>
  );
}
