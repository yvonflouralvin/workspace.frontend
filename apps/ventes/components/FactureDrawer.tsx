"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { getFactureDetail, type FactureDetail, type FactureLigneDetail } from "@/lib/ventes-api";
import { MODE_LABEL, formatMontant, formatQuantite } from "@/lib/commande-ui";
import { PrintOutlined } from "@mui/icons-material";

function formatNum(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function FactureDrawer({ factureId, onClose }: { factureId: number; onClose: () => void }) {
  const [f, setF] = useState<FactureDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFactureDetail(factureId).then(setF).catch((e) => setError(e.message));
  }, [factureId]);

  const base = f?.devises_snapshot?.devise_base ?? "";
  const devises = f?.devises_snapshot?.devises ?? [];
  const tvaTaux = Number(f?.tva_taux ?? 0);
  const totalTTC = Number(f?.montant_total ?? 0);

  function ligneTva(l: FactureLigneDetail): number {
    const t = Number(l.total) || 0;
    return l.tva_applicable ? (t * tvaTaux) / 100 : 0;
  }

  return (
    <RightDrawer title={f ? `Facture ${f.code}` : "Facture"} onClose={onClose} width="w-[760px] max-w-full">
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
              <p className="text-on-surface font-medium">Payé</p>
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
