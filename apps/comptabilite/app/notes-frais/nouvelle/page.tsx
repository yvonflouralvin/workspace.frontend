"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { NoteFraisEditor } from "@/components/NoteFraisEditor";
import { listExercices, type Exercice } from "@/lib/compta-api";

export default function NouvelleNotePage() {
  const router = useRouter();
  const [exercices, setExercices] = useState<Exercice[]>([]);

  useEffect(() => {
    listExercices().then(setExercices);
  }, []);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Nouvelle note de frais</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Une demande d&rsquo;avance avant de dépenser, ou un remboursement de ce que vous avez avancé.
          </p>
        </div>
        <NoteFraisEditor
          exercices={exercices}
          onSaved={(n) => router.push(`/notes-frais/${n.id}`)}
          onCancel={() => router.push("/notes-frais")}
        />
      </div>
    </DashboardShell>
  );
}
