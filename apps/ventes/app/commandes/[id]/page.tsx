"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { PaiementModal } from "@/components/PaiementModal";
import { FactureDrawer } from "@/components/FactureDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  getCommande,
  updateCommande,
  deleteLigneCommande,
  addLigneCommande,
  updateLigneCommande,
  getFacturationConfig,
  listClients,
  createClient,
  listProduits,
  type CommandeDetail,
  type StatutCommande,
  type Client,
  type Produit,
  type DeviseEntry,
} from "@/lib/ventes-api";
import { STATUT_CLASS, STATUT_LABEL, MODE_LABEL, formatMontant, formatQuantite } from "@/lib/commande-ui";
import {
  ArrowBackOutlined,
  DeleteOutlineOutlined,
  EmailOutlined,
  PhoneOutlined,
  PlaceOutlined,
  LockOutlined,
  TaskAltOutlined,
  PaymentsOutlined,
} from "@mui/icons-material";

function formatNum(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function conversions(montant: number, devises: DeviseEntry[]): string {
  return devises.map((d) => `${formatNum(montant * Number(d.taux))} ${d.code}`).join(" · ");
}

function tauxNote(base: string, devises: DeviseEntry[]): string {
  return devises.map((d) => `1 ${base} = ${d.taux} ${d.code}`).join(" · ");
}

function Meta({ icon, value }: { icon: React.ReactNode; value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
      {icon} {value}
    </span>
  );
}

export default function CommandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const canView = can("ventes.commandes.view");
  const canManage = can("ventes.commandes.manage");
  const canPay = can("ventes.factures.manage");

  const [commande, setCommande] = useState<CommandeDetail | null>(null);
  const [qtyDraft, setQtyDraft] = useState<Record<number, string>>({});
  const [deviseBase, setDeviseBase] = useState("");
  const [devises, setDevises] = useState<DeviseEntry[]>([]);
  const [tvaTaux, setTvaTaux] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ligneKey, setLigneKey] = useState(0);
  const [savingStatut, setSavingStatut] = useState(false);
  const [paying, setPaying] = useState(false);
  const [openFactureId, setOpenFactureId] = useState<number | null>(null);

  function applyCommande(cmd: CommandeDetail) {
    setCommande(cmd);
    setQtyDraft(Object.fromEntries(cmd.lignes.map((l) => [l.id, String(l.quantite)])));
  }

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    getFacturationConfig()
      .then((c) => {
        setDeviseBase(c.devise_base);
        setDevises(c.devises ?? []);
        setTvaTaux(Number(c.tva_taux_defaut) || 0);
      })
      .catch(() => {});
    getCommande(Number(id))
      .then(applyCommande)
      .catch(() => setError("Commande introuvable."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canView]);

  async function patchCommande(patch: Parameters<typeof updateCommande>[1]) {
    if (!commande) return;
    try {
      applyCommande(await updateCommande(commande.id, patch));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour.");
    }
  }

  async function changeStatut(statut: StatutCommande) {
    if (!commande) return;
    setSavingStatut(true);
    try {
      applyCommande(await updateCommande(commande.id, { statut }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du changement de statut.");
    } finally {
      setSavingStatut(false);
    }
  }

  async function removeLigne(ligneId: number) {
    if (!commande) return;
    try {
      applyCommande(await deleteLigneCommande(commande.id, ligneId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la suppression.");
    }
  }

  async function addProduit(produitId: number) {
    if (!commande) return;
    try {
      applyCommande(await addLigneCommande(commande.id, { produit_id: produitId, quantite: 1 }));
      setLigneKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout du produit.");
    }
  }

  async function changeQuantite(ligneId: number, value: string) {
    if (!commande) return;
    const q = Number(value);
    if (Number.isNaN(q) || q <= 0) return;
    const ligne = commande.lignes.find((l) => l.id === ligneId);
    if (ligne && Number(ligne.quantite) === q) return;
    try {
      applyCommande(await updateLigneCommande(commande.id, ligneId, q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour de la quantité.");
    }
  }

  const editable = canManage && commande?.statut === "BROUILLON";

  function lineTotal(l: CommandeDetail["lignes"][number]): number {
    const q = Number(qtyDraft[l.id] ?? l.quantite);
    const p = Number(l.prix_unitaire);
    return (Number.isNaN(q) ? 0 : q) * (Number.isNaN(p) ? 0 : p);
  }

  function lineTva(l: CommandeDetail["lignes"][number]): number {
    return l.tva_applicable ? (lineTotal(l) * tvaTaux) / 100 : 0;
  }

  const grandTotal = commande
    ? commande.lignes.reduce((s, l) => s + lineTotal(l) + lineTva(l), 0)
    : 0;

  return (
    <DashboardShell>
      <div className="p-8 space-y-6">
        <Link
          href="/commandes"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux commandes
        </Link>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les commandes.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canView && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && commande && (
          <>
            {/* Entête */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-headline-md font-display text-on-surface">
                      {commande.client?.nom ?? "Commande"}
                    </h1>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium ${STATUT_CLASS[commande.statut]}`}>
                      {STATUT_LABEL[commande.statut]}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-0.5 font-mono">{commande.code}</p>
                </div>
                {canManage && commande.statut === "BROUILLON" && (
                  <button
                    onClick={() => changeStatut("VALIDEE")}
                    disabled={savingStatut}
                    className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0 disabled:opacity-50"
                  >
                    <TaskAltOutlined style={{ fontSize: 18 }} />
                    {savingStatut ? "Validation…" : "Valider la commande"}
                  </button>
                )}
                {canPay && (commande.statut === "VALIDEE" || commande.statut === "PARTIELLE") && commande.lignes.some((l) => !l.paye) && (
                  <button
                    onClick={() => setPaying(true)}
                    className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0"
                  >
                    <PaymentsOutlined style={{ fontSize: 18 }} />
                    Enregistrer un paiement
                  </button>
                )}
              </div>

              {canManage && !editable && (
                <p className="inline-flex items-center gap-1.5 bg-surface-container rounded-xl px-4 py-2 text-body-sm text-on-surface-variant">
                  <LockOutlined style={{ fontSize: 16 }} />
                  Commande {STATUT_LABEL[commande.statut].toLowerCase()} — contenu en lecture seule.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-outline-variant pt-4">
                <div>
                  <label className="block text-label-md font-medium text-on-surface-variant mb-1.5">Client</label>
                  {editable ? (
                    <SearchSelect<Client>
                      value={commande.client_id}
                      initialLabel={commande.client?.nom}
                      placeholder="Rechercher un client…"
                      fetchOptions={(q) => listClients({ q: q || undefined, page_size: 10 }).then((p) => p.items)}
                      getOptionLabel={(c) => c.nom}
                      getOptionValue={(c) => c.id}
                      onChange={(v) => patchCommande({ client_id: v === null ? null : Number(v) })}
                      onCreate={async (nom) => {
                        const c = await createClient({ nom });
                        await patchCommande({ client_id: c.id });
                      }}
                      createLabel={(q) => `Créer le client « ${q} »`}
                    />
                  ) : (
                    <p className="text-body-md text-on-surface">{commande.client?.nom ?? "—"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-label-md font-medium text-on-surface-variant mb-1.5">Date de la commande</label>
                  {editable ? (
                    <input
                      type="date"
                      value={commande.date_commande ?? ""}
                      onChange={(e) => patchCommande({ date_commande: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                    />
                  ) : (
                    <p className="text-body-md text-on-surface">{commande.date_commande ?? "—"}</p>
                  )}
                </div>
              </div>
              {commande.client && (
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <Meta icon={<EmailOutlined style={{ fontSize: 16 }} />} value={commande.client.email} />
                  <Meta icon={<PhoneOutlined style={{ fontSize: 16 }} />} value={commande.client.telephone} />
                  <Meta icon={<PlaceOutlined style={{ fontSize: 16 }} />} value={commande.client.adresse_ville} />
                </div>
              )}
            </div>

            {/* Lignes */}
            <div className="space-y-3">
              <h2 className="text-headline-sm font-display text-on-surface">Produits</h2>

              {commande.lignes.length === 0 && !editable ? (
                <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-6 text-center">
                  Aucun produit dans cette commande.
                </p>
              ) : (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                        <th className="px-5 py-3 font-medium">Produit</th>
                        <th className="px-5 py-3 font-medium text-right">Quantité</th>
                        <th className="px-5 py-3 font-medium text-right">Prix unitaire</th>
                        <th className="px-5 py-3 font-medium text-right">Total</th>
                        {editable && <th className="px-5 py-3 font-medium w-10" />}
                      </tr>
                    </thead>
                    <tbody>
                      {commande.lignes.map((l) => (
                        <tr key={l.id} className="border-b border-outline-variant">
                          <td className="px-5 py-3 text-on-surface font-medium">
                            {l.produit_nom}
                            {l.paye && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-secondary/10 text-secondary">
                                Payé
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editable ? (
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={qtyDraft[l.id] ?? String(l.quantite)}
                                onChange={(e) => setQtyDraft((d) => ({ ...d, [l.id]: e.target.value }))}
                                onBlur={(e) => changeQuantite(l.id, e.target.value)}
                                className="w-24 px-2 py-1 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface text-right tabular-nums focus:outline-none focus:border-primary transition-colors"
                              />
                            ) : (
                              <span className="tabular-nums text-on-surface-variant">{formatQuantite(l.quantite)}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant text-right tabular-nums align-top">{formatMontant(l.prix_unitaire, deviseBase)}</td>
                          <td className="px-5 py-3 text-on-surface text-right tabular-nums align-top">
                            {formatMontant(lineTotal(l) + lineTva(l), deviseBase)}
                            {l.tva_applicable && tvaTaux > 0 && (
                              <div className="text-label-sm font-normal text-on-surface-variant/70">
                                {formatMontant(lineTva(l), deviseBase)} TVA ({tvaTaux} %)
                              </div>
                            )}
                          </td>
                          {editable && (
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => removeLigne(l.id)}
                                title="Retirer"
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                              >
                                <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {editable && (
                        <tr className="border-b border-outline-variant">
                          <td className="px-3 py-2" colSpan={5}>
                            <SearchSelect<Produit>
                              key={ligneKey}
                              value={null}
                              placeholder="Ajouter un produit…"
                              fetchOptions={(q) => listProduits({ q: q || undefined, page_size: 10 }).then((p) => p.items)}
                              getOptionLabel={(p) => p.nom}
                              getOptionValue={(p) => p.id}
                              onChange={(v) => { if (v !== null) addProduit(Number(v)); }}
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-outline-variant">
                        <td className="px-5 py-3 text-on-surface font-medium" colSpan={3}>Total</td>
                        <td className="px-5 py-3 text-on-surface font-semibold text-right tabular-nums">
                          {formatMontant(grandTotal, deviseBase)}
                          {devises.length > 0 && grandTotal > 0 && (
                            <div className="text-label-sm font-normal text-on-surface-variant/70">
                              {conversions(grandTotal, devises)}
                            </div>
                          )}
                        </td>
                        {editable && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {devises.length > 0 && grandTotal > 0 && (
                <p className="text-label-sm text-on-surface-variant/70 px-1">
                  Taux : {tauxNote(deviseBase, devises)} — définis dans Paramètres › Devise.
                </p>
              )}
            </div>

            {commande.factures.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-headline-sm font-display text-on-surface">Factures</h2>
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
                  {commande.factures.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setOpenFactureId(f.id)}
                      className="w-full flex items-center gap-4 px-5 py-3 text-body-sm text-left hover:bg-surface-container-low transition-colors"
                    >
                      <span className="font-mono text-label-md text-on-surface-variant">{f.code}</span>
                      <span className="text-on-surface-variant">{f.date_facture ?? "—"}</span>
                      <span className="flex-1 text-on-surface-variant">
                        {f.mode_paiement ? MODE_LABEL[f.mode_paiement] ?? f.mode_paiement : "—"}
                      </span>
                      <span className="text-on-surface font-medium tabular-nums">
                        {formatMontant(f.montant_total, deviseBase)}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-secondary/10 text-secondary">
                        Payé
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {paying && (
              <PaiementModal
                commande={commande}
                tvaTaux={tvaTaux}
                deviseBase={deviseBase}
                onClose={() => setPaying(false)}
                onPaid={applyCommande}
              />
            )}

            {openFactureId !== null && (
              <FactureDrawer factureId={openFactureId} onClose={() => setOpenFactureId(null)} />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
