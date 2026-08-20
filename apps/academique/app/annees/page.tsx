"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Annee } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const TEINTE: Record<string, string> = {
  PREPARATION: "bg-surface-container text-on-surface-variant",
  EN_COURS: "bg-secondary/15 text-secondary",
  CLOTUREE: "bg-surface-container text-outline",
};

/** Les années académiques.
 *
 *  Trois états dans un seul sens : on prépare, on ouvre, on clôt. L'écran le
 *  montre tel quel — une année clôturée n'offre plus aucun bouton, parce que
 *  ses effectifs sont arrêtés.
 */
export default function AnneesPage() {
  const { can } = usePermissions();
  const peutGerer = can("academique.annees.manage");
  const contexte = useContexte();
  const etab = contexte.etablissement;

  const [annees, setAnnees] = useState<Annee[] | null>(null);
  const [libelle, setLibelle] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aCloturer, setACloturer] = useState<Annee | null>(null);

  const charger = useCallback(async () => {
    if (!etab) return;
    try {
      setAnnees(await api.annees(etab.id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setAnnees([]);
    }
  }, [etab]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function agir(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setErreur(null);
    try {
      await action();
      setToast(message);
      await charger();
      await contexte.rechargerAnnee();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[840px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Années académiques</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          On prépare une année — ses promotions se dessinent sans que personne ne soit inscrit —
          puis on l&apos;ouvre, et enfin on la clôt. Une seule année est ouverte à la fois.
        </p>

        <div className="mt-4">
          <BarreContexte
            etablissement={etab}
            surnombre={contexte.surnombre}
          />
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        {peutGerer && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              className={`${CHAMP} w-[200px]`}
              placeholder="2026-2027"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !libelle.trim() || !etab}
              onClick={() =>
                agir(async () => {
                  await api.creerAnnee(etab!.id, { libelle: libelle.trim() });
                  setLibelle("");
                }, "Année créée, en préparation.")
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Créer une année
            </button>
          </div>
        )}

        {annees === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : annees.length === 0 ? (
          <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center text-body-sm text-on-surface-variant">
            Aucune année. Créez-en une pour commencer.
          </p>
        ) : (
          <div className="divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {annees.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-body-md font-medium text-on-surface">
                    {a.libelle}
                  </span>
                  {a.ouverte_le && (
                    <span className="block text-label-md text-outline">
                      ouverte le{" "}
                      {new Date(a.ouverte_le).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {a.cloturee_le &&
                        `, clôturée le ${new Date(a.cloturee_le).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}`}
                    </span>
                  )}
                </span>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-label-md ${TEINTE[a.etat]}`}
                >
                  {a.etat_libelle}
                </span>
                {peutGerer && a.etat === "PREPARATION" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => agir(() => api.ouvrirAnnee(a.id), "Année ouverte.")}
                    className="h-8 flex-none rounded-lg bg-primary px-3 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                  >
                    Ouvrir
                  </button>
                )}
                {peutGerer && a.etat === "EN_COURS" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setACloturer(a)}
                    className="h-8 flex-none rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
                  >
                    Clôturer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {aCloturer && (
          <ConfirmDialog
            title={`Clôturer ${aCloturer.libelle} ?`}
            message="Une année clôturée ne se rouvre pas : ses effectifs sont arrêtés, et plus aucune inscription ne peut y être faite ni modifiée."
            confirmLabel="Clôturer"
            onCancel={() => setACloturer(null)}
            onConfirm={async () => {
              const cible = aCloturer;
              setACloturer(null);
              await agir(() => api.cloturerAnnee(cible.id), "Année clôturée.");
            }}
          />
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
