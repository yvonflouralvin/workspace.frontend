"use client";

import { useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { syncStockInventory } from "@/app/lib/api";
import { syncExamensFacturation } from "@/app/lib/examens-api";
import { ArrowBackOutlined, SyncOutlined } from "@mui/icons-material";

function SyncCard({
  titre,
  description,
  bouton,
  onSync,
}: {
  titre: string;
  description: string;
  bouton: string;
  onSync: () => Promise<string>;
}) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setSyncing(true);
    setResult(null);
    setError(null);
    try {
      setResult(await onSync());
    } catch {
      setError("Échec de la synchronisation. Vérifiez que l'application cible est disponible.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-3">
      <div>
        <h2 className="text-headline-sm font-display text-on-surface">{titre}</h2>
        <p className="text-body-sm text-on-surface-variant mt-1">{description}</p>
      </div>
      <button
        onClick={handle}
        disabled={syncing}
        className="inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary px-4 py-2 text-body-md font-medium hover:bg-primary-container disabled:opacity-60 transition-colors"
      >
        <SyncOutlined style={{ fontSize: 18 }} />
        {syncing ? "Synchronisation…" : bouton}
      </button>
      {result && <p className="text-body-sm text-secondary">{result}</p>}
      {error && <p className="text-body-sm text-error">{error}</p>}
    </section>
  );
}

export default function SynchroPage() {
  const { can } = usePermissions();
  const canManage = can("hosto.settings.manage");

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <Link
          href="/parametres"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux paramètres
        </Link>

        <div>
          <h1 className="text-headline-md font-display text-on-surface">Synchronisation</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Lancer les synchronisations des données de hosto avec les autres applications.
          </p>
        </div>

        {!canManage ? (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission d&apos;accéder aux paramètres.
          </p>
        ) : (
          <div className="space-y-6">
            <SyncCard
              titre="Services → Facturation"
              description="Enregistre dans l'application Facturation les services hospitaliers non encore synchronisés, sous forme de produits « Consultation ». À utiliser si des services créés n'y apparaissent pas."
              bouton="Synchroniser avec Facturation"
              onSync={async () => {
                const r = await syncStockInventory();
                return r.synced > 0
                  ? `${r.synced} service(s) synchronisé(s) vers Facturation (${r.total} au total).`
                  : `Rien à synchroniser — les ${r.total} service(s) sont déjà à jour.`;
              }}
            />
            <SyncCard
              titre="Examens médicaux → Facturation"
              description="Enregistre les examens médicaux (LOINC et personnalisés) comme produits dans l'application Facturation, sous la catégorie « ExamenMedical » (verrouillée à la suppression)."
              bouton="Synchroniser les examens"
              onSync={async () => {
                const r = await syncExamensFacturation();
                return r.synced > 0
                  ? `${r.synced} examen(s) synchronisé(s) vers Facturation (${r.total} au total).`
                  : `Aucun examen synchronisé (${r.total} au total).`;
              }}
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
