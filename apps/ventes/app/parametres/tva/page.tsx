"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { getParametre, updateParametre } from "@/lib/ventes-api";
import { ArrowBackOutlined } from "@mui/icons-material";

interface TvaValeur {
  taux_defaut: number | string | null;
}

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export default function TvaSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("ventes.settings.manage");

  const [taux, setTaux] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    getParametre<TvaValeur>("tva")
      .then((p) => setTaux(p.valeur?.taux_defaut != null ? String(p.valeur.taux_defaut) : ""))
      .catch(() => setError("Impossible de charger le paramètre TVA."))
      .finally(() => setLoading(false));
  }, [canManage]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateParametre<TvaValeur>("tva", {
        taux_defaut: taux.trim() === "" ? null : Number(taux),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Link
          href="/parametres"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux paramètres
        </Link>

        <div>
          <h1 className="text-headline-md font-display text-on-surface">TVA</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Taux de TVA par défaut appliqué à la facturation. Il s&apos;applique aux produits pour
            lesquels la TVA est activée.
          </p>
        </div>

        {!canManage && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de gérer les paramètres.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canManage && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canManage && !loading && (
          <form
            onSubmit={save}
            className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4"
          >
            <div className="max-w-xs">
              <label className={labelCls}>Taux de TVA par défaut (%)</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={taux}
                onChange={(e) => { setTaux(e.target.value); setSaved(false); }}
                placeholder="16"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center bg-primary text-on-primary text-body-md font-medium px-5 py-2 rounded-xl hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              {saved && <span className="text-body-sm text-secondary">Taux enregistré.</span>}
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
