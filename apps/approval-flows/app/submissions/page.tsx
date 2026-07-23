"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { ConsoleTabs } from "@/components/ConsoleTabs";

// "Mes soumissions" (liste + filtres) a migré sur l'accueil de l'app
// (app/page.tsx, "MyRequest"). Cette page deviendra le futur écran des
// formulaires intégralement approuvés — pas encore construit.
export default function SubmissionPage() {
  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-5">
        <ConsoleTabs />
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Submission</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Formulaires intégralement approuvés.
          </p>
        </div>

        <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
          Bientôt disponible.
        </p>
      </div>
    </DashboardShell>
  );
}
