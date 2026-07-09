"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { DeviseDrawer } from "@/components/DeviseDrawer";
import { getParametre, updateParametre, type DeviseEntry, type DeviseValeur } from "@/lib/ventes-api";
import {
  ArrowBackOutlined,
  AddOutlined,
  EditOutlined,
  DeleteOutlineOutlined,
} from "@mui/icons-material";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export default function DeviseSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("ventes.settings.manage");

  const [baseDevise, setBaseDevise] = useState("");
  const [devises, setDevises] = useState<DeviseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingBase, setSavingBase] = useState(false);
  const [baseSaved, setBaseSaved] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; entry: DeviseEntry | null }>({
    open: false,
    entry: null,
  });

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    getParametre<DeviseValeur>("devise")
      .then((p) => {
        setBaseDevise(p.valeur?.devise_base ?? "");
        setDevises(p.valeur?.devises ?? []);
      })
      .catch(() => setError("Impossible de charger la configuration des devises."))
      .finally(() => setLoading(false));
  }, [canManage]);

  async function persist(base: string, list: DeviseEntry[]) {
    await updateParametre<DeviseValeur>("devise", { devise_base: base, devises: list });
  }

  async function saveBase(e: React.FormEvent) {
    e.preventDefault();
    setSavingBase(true);
    setBaseSaved(false);
    setError(null);
    try {
      const base = baseDevise.trim().toUpperCase();
      await persist(base, devises);
      setBaseDevise(base);
      setBaseSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSavingBase(false);
    }
  }

  async function handleDelete(code: string) {
    const next = devises.filter((d) => d.code !== code);
    try {
      await persist(baseDevise.trim().toUpperCase(), next);
      setDevises(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  }

  async function handleDeviseSave(entry: DeviseEntry) {
    const original = drawer.entry;
    const next = original
      ? devises.map((d) => (d.code === original.code ? entry : d))
      : [...devises, entry];
    next.sort((a, b) => a.code.localeCompare(b.code));
    await persist(baseDevise.trim().toUpperCase(), next);
    setDevises(next);
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
          <h1 className="text-headline-md font-display text-on-surface">Devise</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Devise de facturation et devises supplémentaires à faire figurer dans le total.
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
          <>
            {/* Devise de base */}
            <form
              onSubmit={saveBase}
              className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4"
            >
              <div>
                <h2 className="text-headline-sm font-display text-on-surface">Devise de facturation</h2>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  Devise principale utilisée pour établir les factures.
                </p>
              </div>
              <div className="max-w-xs">
                <label className={labelCls}>Devise de base</label>
                <input
                  className={inputCls}
                  value={baseDevise}
                  onChange={(e) => { setBaseDevise(e.target.value); setBaseSaved(false); }}
                  placeholder="CDF"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingBase}
                  className="inline-flex items-center bg-primary text-on-primary text-body-md font-medium px-5 py-2 rounded-xl hover:bg-primary-container transition-colors disabled:opacity-50"
                >
                  {savingBase ? "Enregistrement…" : "Enregistrer"}
                </button>
                {baseSaved && <span className="text-body-sm text-secondary">Devise enregistrée.</span>}
              </div>
            </form>

            {/* Autres devises */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-headline-sm font-display text-on-surface">
                    Autres devises du total
                  </h2>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    Devises supplémentaires affichées dans le total, avec leur taux d&apos;évaluation.
                  </p>
                </div>
                <button
                  onClick={() => setDrawer({ open: true, entry: null })}
                  className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0"
                >
                  <AddOutlined style={{ fontSize: 18 }} /> Ajouter
                </button>
              </div>

              {devises.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  Aucune devise supplémentaire. Le total ne s&apos;affichera qu&apos;en{" "}
                  {baseDevise || "devise de base"}.
                </p>
              ) : (
                <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant overflow-hidden">
                  {devises.map((d) => (
                    <div key={d.code} className="flex items-center gap-4 px-4 py-3">
                      <span className="text-body-md font-medium text-on-surface w-16 shrink-0 font-mono">
                        {d.code}
                      </span>
                      <span className="text-body-sm text-on-surface-variant flex-1 min-w-0 truncate">
                        {d.libelle || "—"}
                      </span>
                      <span className="text-body-sm text-on-surface tabular-nums">
                        1 {baseDevise || "base"} = {d.taux} {d.code}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => setDrawer({ open: true, entry: d })}
                          title="Modifier"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                        >
                          <EditOutlined style={{ fontSize: 16 }} />
                        </button>
                        <button
                          onClick={() => handleDelete(d.code)}
                          title="Supprimer"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                        >
                          <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {drawer.open && (
        <DeviseDrawer
          entry={drawer.entry}
          baseDevise={baseDevise}
          existingCodes={devises
            .filter((d) => d.code !== drawer.entry?.code)
            .map((d) => d.code)}
          onClose={() => setDrawer({ open: false, entry: null })}
          onSave={handleDeviseSave}
        />
      )}
    </DashboardShell>
  );
}
