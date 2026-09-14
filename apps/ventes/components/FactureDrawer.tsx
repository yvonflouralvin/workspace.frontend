"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  getFactureDetail,
  addFacturePaiement,
  deleteFacturePaiement,
  type FactureDetail,
  type FactureLigneDetail,
} from "@/lib/ventes-api";
import { MODE_LABEL, formatMontant, formatQuantite } from "@/lib/commande-ui";
import { PrintOutlined, DeleteOutlined, AddOutlined } from "@mui/icons-material";

function formatNum(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUT_FACTURE_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

export function FactureDrawer({ factureId, onClose }: { factureId: number; onClose: () => void }) {
  const [f, setF] = useState<FactureDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [montantSaisi, setMontantSaisi] = useState("");
  const [modeSaisi, setModeSaisi] = useState("");
  const [saving, setSaving] = useState(false);
  const [paiementError, setPaiementError] = useState<string | null>(null);

  function reload() {
    getFactureDetail(factureId).then(setF).catch((e) => setError(e.message));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factureId]);

  const base = f?.devises_snapshot?.devise_base ?? "";
  const devises = f?.devises_snapshot?.devises ?? [];
  const tvaTaux = Number(f?.tva_taux ?? 0);
  const totalTTC = Number(f?.montant_total ?? 0);
  const totalPaye = Number(f?.montant_paye ?? 0);
  const resteAPayer = Math.max(0, totalTTC - totalPaye);

  async function ajouterPaiement(e: React.FormEvent) {
    e.preventDefault();
    const montant = Number(montantSaisi);
    if (!montant || montant <= 0) {
      setPaiementError("Montant invalide.");
      return;
    }
    setSaving(true);
    setPaiementError(null);
    try {
      const updated = await addFacturePaiement(factureId, {
        montant,
        mode: modeSaisi || undefined,
        date_paiement: new Date().toISOString().slice(0, 10),
      });
      setF(updated);
      setMontantSaisi("");
      setModeSaisi("");
    } catch (err) {
      setPaiementError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function retirerPaiement(paiementId: number) {
    try {
      const updated = await deleteFacturePaiement(factureId, paiementId);
      setF(updated);
    } catch {
      setPaiementError("Impossible de supprimer ce paiement.");
    }
  }

  function ligneTva(l: FactureLigneDetail): number {
    const t = Number(l.total) || 0;
    return l.tva_applicable ? (t * tvaTaux) / 100 : 0;
  }

  return (
    <RightDrawer title={f ? `Facture ${f.code}` : "Facture"} onClose={onClose} width="md:w-[760px] md:max-w-full">
      {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
      {!f && !error && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

      {f && (
        <div className="space-y-5">
          {/* Méta */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-body-sm">
            <div>
              <span className="text-on-surface-variant">Client</span>
              <p className="text-on-surface font-medium">{f.client?.nom ?? "—"}</p>
            </div>
            <div>
              <span className="text-on-surface-variant">Date</span>
              <p className="text-on-surface font-medium">{f.date_facture ?? "—"}</p>
            </div>
            <div>
              <span className="text-on-surface-variant">Mode de paiement</span>
              <p className="text-on-surface font-medium">
                {f.mode_paiement ? MODE_LABEL[f.mode_paiement] ?? f.mode_paiement : "—"}
              </p>
            </div>
            <div>
              <span className="text-on-surface-variant">Statut</span>
              <p className="text-on-surface font-medium">
                {STATUT_FACTURE_LABEL[f.statut] ?? f.statut}
              </p>
            </div>
          </div>

          {/* Tableau produits */}
          <div className="rounded-xl border border-outline-variant overflow-hidden">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  <th className="px-4 py-2.5 font-medium">Produit</th>
                  <th className="px-4 py-2.5 font-medium text-right">Qté</th>
                  <th className="px-4 py-2.5 font-medium text-right">Prix unitaire</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {f.lignes.map((l) => (
                  <tr key={l.id} className="border-b border-outline-variant">
                    <td className="px-4 py-2.5 text-on-surface font-medium">{l.produit_nom}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-on-surface-variant">{formatQuantite(l.quantite)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-on-surface-variant">{formatMontant(l.prix_unitaire, base)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-on-surface align-top">
                      {formatMontant(Number(l.total) + ligneTva(l), base)}
                      {l.tva_applicable && tvaTaux > 0 && (
                        <div className="text-label-sm font-normal text-on-surface-variant/70">
                          {formatMontant(ligneTva(l), base)} TVA ({tvaTaux} %)
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-outline-variant">
                  <td className="px-4 py-3 text-on-surface font-medium" colSpan={3}>Total général</td>
                  <td className="px-4 py-3 text-on-surface font-semibold text-right tabular-nums">
                    {formatMontant(totalTTC, base)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Paiements */}
          <div className="rounded-xl border border-outline-variant p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-label-md font-medium text-on-surface-variant">Paiements</p>
              <p className="text-body-sm text-on-surface-variant">
                {formatMontant(totalPaye, base)} reçu · {formatMontant(resteAPayer, base)} restant
              </p>
            </div>

            {f.paiements.length > 0 && (
              <ul className="divide-y divide-outline-variant/60">
                {f.paiements.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-body-sm">
                    <div>
                      <span className="text-on-surface font-medium">{formatMontant(p.montant, base)}</span>
                      <span className="text-on-surface-variant ml-2">
                        {p.date_paiement ?? "—"}
                        {p.mode ? ` · ${MODE_LABEL[p.mode] ?? p.mode}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => retirerPaiement(p.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors"
                      aria-label="Retirer ce paiement"
                    >
                      <DeleteOutlined style={{ fontSize: 15 }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {paiementError && <p className="text-body-sm text-error">{paiementError}</p>}

            <form onSubmit={ajouterPaiement} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-label-sm text-on-surface-variant mb-1">Montant</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montantSaisi}
                  onChange={(e) => setMontantSaisi(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-label-sm text-on-surface-variant mb-1">Mode</label>
                <select
                  value={modeSaisi}
                  onChange={(e) => setModeSaisi(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-sm outline-none focus:border-primary"
                >
                  <option value="">—</option>
                  {Object.entries(MODE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter
              </button>
            </form>
          </div>

          {/* Total en devises */}
          {devises.length > 0 && (
            <div className="rounded-xl bg-surface-container px-4 py-3 space-y-1.5">
              <p className="text-label-md font-medium text-on-surface-variant">Total en devises</p>
              {devises.map((d) => (
                <div key={d.code} className="flex items-center justify-between text-body-sm">
                  <span className="text-on-surface-variant">{d.libelle ? `${d.libelle} (${d.code})` : d.code}</span>
                  <span className="text-on-surface tabular-nums">{formatNum(totalTTC * Number(d.taux))} {d.code}</span>
                </div>
              ))}
            </div>
          )}

          {/* Taux appliqués */}
          {(devises.length > 0 || tvaTaux > 0) && (
            <p className="text-label-sm text-on-surface-variant/70">
              Taux appliqués{f.date_facture ? ` le ${f.date_facture}` : ""} :{" "}
              {[
                ...devises.map((d) => `1 ${base} = ${d.taux} ${d.code}`),
                ...(tvaTaux > 0 ? [`TVA ${tvaTaux} %`] : []),
              ].join(" · ")}
            </p>
          )}

          {/* Impression PDF */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => window.open(`/api/factures/${f.id}/pdf`, "_blank")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors"
            >
              <PrintOutlined style={{ fontSize: 18 }} />
              Imprimer en PDF
            </button>
          </div>
        </div>
      )}
    </RightDrawer>
  );
}
