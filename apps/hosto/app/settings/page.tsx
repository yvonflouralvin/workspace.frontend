"use client";

import { useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { syncStockInventory } from "@/app/lib/api";
import { SettingsOutlined, SyncOutlined } from "@mui/icons-material";

export default function SettingsPage() {
  const { can } = usePermissions();
  const canManage = can("hosto.settings.manage");

  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setError(null);
    try {
      const r = await syncStockInventory();
      setResult(
        r.synced > 0
          ? `${r.synced} service(s) synchronisé(s) vers Stock (${r.total} au total).`
          : `Rien à synchroniser — les ${r.total} service(s) sont déjà à jour.`
      );
    } catch {
      setError("Échec de la synchronisation. Vérifiez que le service Stock est disponible.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-lg max-w-3xl">
        <h1 className="text-headline-md text-on-surface mb-lg flex items-center gap-2">
          <SettingsOutlined /> Paramètres
        </h1>

        {canManage ? (
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <h2 className="text-headline-sm text-on-surface mb-2">Synchronisation Stock</h2>
            <p className="text-body-md text-on-surface-variant mb-md">
              Enregistre dans l'app Stock les services hospitaliers non encore synchronisés,
              sous forme d'articles de type « Consultation ». À utiliser si des services créés
              n'apparaissent pas dans Stock.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary px-4 py-2 text-body-md hover:bg-primary-container disabled:opacity-60 transition-colors"
            >
              <SyncOutlined style={{ fontSize: 18 }} />
              {syncing ? "Synchronisation…" : "Synchroniser avec Stock"}
            </button>
            {result && <p className="mt-md text-body-md text-secondary">{result}</p>}
            {error && <p className="mt-md text-body-md text-error">{error}</p>}
          </section>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            Vous n'avez pas la permission d'accéder aux paramètres.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
