"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { AideFlottante } from "@/components/AideFlottante";
import {
  getConfiguration,
  listDevisesDisponibles,
  updateConfiguration,
  type DeviseDisponible,
} from "@/lib/compta-api";
import { CheckCircleOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

const AIDE = {
  titre: "La devise de tenue",
  contenu: (
    <>
      <p>
        La devise de tenue est celle dans laquelle <strong>toute écriture comptable</strong> est
        enregistrée — le bilan, le compte de résultat et la balance s&rsquo;expriment toujours
        dans cette seule devise, comme l&rsquo;exige la comptabilité en partie double.
      </p>
      <p>
        Elle se choisit parmi les devises déjà déclarées dans <strong>Facturation</strong> (Ventes
        › Paramètres › Devise) — la Comptabilité ne gère pas sa propre liste, elle réutilise celle
        de la facturation.
      </p>
      <p>
        Si une facture à comptabiliser est émise dans une autre devise que la tenue, le montant est
        converti automatiquement au taux enregistré sur cette facture au moment de son émission.
      </p>
    </>
  ),
};

export default function DeviseSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("comptabilite.parametrage.manage");

  const [deviseTenue, setDeviseTenue] = useState<string | null>(null);
  const [choix, setChoix] = useState("");
  const [devises, setDevises] = useState<DeviseDisponible[] | null>(null);
  const [chargementDevises, setChargementDevises] = useState(true);
  const [erreurDevises, setErreurDevises] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConfiguration().then((c) => {
      setDeviseTenue(c.devise_tenue);
      if (c.devise_tenue) setChoix(c.devise_tenue);
    });
    listDevisesDisponibles()
      .then((list) => {
        setDevises(list);
        setChargementDevises(false);
      })
      .catch((err) => {
        setErreurDevises(err instanceof Error ? err.message : "Erreur inattendue");
        setChargementDevises(false);
      });
  }, []);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!choix) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateConfiguration(choix);
      setDeviseTenue(res.devise_tenue);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[700px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Devise</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Devise de tenue de la comptabilité — toutes les écritures y sont exprimées.
          </p>
        </div>

        {!canManage ? (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&rsquo;avez pas la permission de gérer les paramètres.
          </p>
        ) : chargementDevises ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : erreurDevises ? (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{erreurDevises}</p>
        ) : devises && devises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">
              Aucune devise déclarée côté Facturation — configurez d&rsquo;abord une devise de base
              dans Ventes › Paramètres › Devise.
            </p>
          </div>
        ) : (
          <form onSubmit={enregistrer} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-6 space-y-4">
            {error && <p className="text-body-sm text-error">{error}</p>}
            {deviseTenue ? (
              <p className="inline-flex items-center gap-1.5 text-body-sm text-member-active">
                <CheckCircleOutlined style={{ fontSize: 16 }} />
                Devise de tenue actuelle : <span className="font-mono font-semibold">{deviseTenue}</span>
              </p>
            ) : (
              <p className="rounded-lg border border-error-container bg-error-container/40 px-3 py-2 text-body-sm text-error">
                Aucune devise de tenue configurée — aucune écriture ne peut être passée tant que ce
                réglage n&rsquo;est pas fait.
              </p>
            )}
            <div className="max-w-[20rem]">
              <label className="block text-label-sm uppercase text-outline mb-1">Devise de tenue</label>
              <select value={choix} onChange={(e) => setChoix(e.target.value)} className={`${FIELD} w-full`}>
                <option value="">—</option>
                {devises?.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}{d.libelle ? ` — ${d.libelle}` : ""}{d.est_devise_base ? " (devise de facturation)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !choix}
                className="inline-flex items-center bg-primary text-on-primary text-body-md font-medium px-5 py-2 rounded-xl hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              {saved && <span className="text-body-sm text-member-active">Devise de tenue enregistrée.</span>}
            </div>
          </form>
        )}
      </div>
      <AideFlottante titre={AIDE.titre}>{AIDE.contenu}</AideFlottante>
    </DashboardShell>
  );
}
