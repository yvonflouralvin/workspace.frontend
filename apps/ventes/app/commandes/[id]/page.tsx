"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import { PaiementModal } from "@/components/PaiementModal";
import { FactureDrawer } from "@/components/FactureDrawer";
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
import {
  STATUT_CLASS,
  STATUT_LABEL,
  MODE_LABEL,
  formatMontant,
  formatQuantite,
} from "@/lib/commande-ui";
import {
  ArrowBackOutlined,
  DeleteOutlineOutlined,
  EmailOutlined,
  PhoneOutlined,
  PlaceOutlined,
  LockOutlined,
  TaskAltOutlined,
  PaymentsOutlined,
  CheckOutlined,
  OpenInNewOutlined,
} from "@mui/icons-material";

const SECTION_LABEL = "text-label-sm uppercase text-outline";

/** Étapes du cycle de vie — « Annulée » sort du parcours et s'affiche à part. */
const CYCLE: { key: string; label: string; reached: (s: StatutCommande) => boolean }[] = [
  { key: "BROUILLON", label: "Brouillon", reached: () => true },
  {
    key: "VALIDEE",
    label: "Validée",
    reached: (s) => ["VALIDEE", "PARTIELLE", "PAYEE"].includes(s),
  },
  { key: "PARTIELLE", label: "Facturée", reached: (s) => ["PARTIELLE", "PAYEE"].includes(s) },
  { key: "PAYEE", label: "Payée", reached: (s) => s === "PAYEE" },
];

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
  const [notesDraft, setNotesDraft] = useState("");
  const [deviseBase, setDeviseBase] = useState("");
  const [devises, setDevises] = useState<DeviseEntry[]>([]);
  const [tvaTaux, setTvaTaux] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ligneKey, setLigneKey] = useState(0);
  const [savingStatut, setSavingStatut] = useState(false);
  const [paying, setPaying] = useState(false);
  const [openFactureId, setOpenFactureId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function applyCommande(cmd: CommandeDetail) {
    setCommande(cmd);
    setQtyDraft(Object.fromEntries(cmd.lignes.map((l) => [l.id, String(l.quantite)])));
    setNotesDraft(cmd.notes ?? "");
  }

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
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
      setToast(`Commande ${STATUT_LABEL[statut].toLowerCase()}.`);
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

  const totaux = useMemo(() => {
    if (!commande) return { sousTotal: 0, tva: 0, total: 0, paye: 0, restant: 0, lignesPayees: 0 };
    const sousTotal = commande.lignes.reduce((s, l) => s + lineTotal(l), 0);
    const tva = commande.lignes.reduce((s, l) => s + lineTva(l), 0);
    const paye = commande.lignes
      .filter((l) => l.paye)
      .reduce((s, l) => s + lineTotal(l) + lineTva(l), 0);
    const total = sousTotal + tva;
    return {
      sousTotal,
      tva,
      total,
      paye,
      restant: Math.max(0, total - paye),
      lignesPayees: commande.lignes.filter((l) => l.paye).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commande, qtyDraft, tvaTaux]);

  const pct = totaux.total > 0 ? Math.round((totaux.paye / totaux.total) * 100) : 0;
  const grandTotal = totaux.total;

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <Link
          href="/commandes"
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} /> Commandes
        </Link>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les commandes.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        {canView && loading && <p className="text-body-md text-on-surface-variant">Chargement…</p>}

        {canView && !loading && commande && (
          <>
            {/* Entête + cycle de vie */}
            <div className="flex items-start gap-4 flex-wrap mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-headline-md text-on-surface truncate">
                    {commande.client?.nom ?? "Commande"}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUT_CLASS[commande.statut]}`}
                  >
                    {STATUT_LABEL[commande.statut]}
                  </span>
                </div>
                <p className="font-mono text-label-md text-outline mt-0.5">{commande.code}</p>
              </div>

              <div className="flex flex-1 md:flex-none items-center gap-2.5">
                {canManage && commande.statut === "BROUILLON" && (
                  <button
                    onClick={() => changeStatut("VALIDEE")}
                    disabled={savingStatut}
                    className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <TaskAltOutlined style={{ fontSize: 16 }} />
                    {savingStatut ? "Validation…" : "Valider la commande"}
                  </button>
                )}
                {canPay &&
                  (commande.statut === "VALIDEE" || commande.statut === "PARTIELLE") &&
                  commande.lignes.some((l) => !l.paye) && (
                    <button
                      onClick={() => setPaying(true)}
                      className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
                    >
                      <PaymentsOutlined style={{ fontSize: 16 }} />
                      Encaisser
                    </button>
                  )}
              </div>
            </div>

            {commande.statut === "ANNULEE" ? (
              <p className="rounded-xl bg-error-container px-4 py-3 text-body-sm text-on-error-container mb-5">
                Cette commande est annulée.
              </p>
            ) : (
              <ol className="flex items-center gap-2 mb-5 overflow-x-auto">
                {CYCLE.map((step, i) => {
                  const reached = step.reached(commande.statut);
                  const current =
                    reached && !CYCLE[i + 1]?.reached(commande.statut);
                  return (
                    <li key={step.key} className="flex items-center gap-2 flex-none">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-md font-semibold whitespace-nowrap ${
                          current
                            ? "bg-primary text-on-primary"
                            : reached
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-container text-outline"
                        }`}
                      >
                        {reached && !current && <CheckOutlined style={{ fontSize: 13 }} />}
                        {step.label}
                      </span>
                      {i < CYCLE.length - 1 && (
                        <span
                          className={`w-6 h-px ${reached ? "bg-primary/40" : "bg-outline-variant"}`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {canManage && !editable && commande.statut !== "ANNULEE" && (
              <p className="inline-flex items-center gap-1.5 bg-surface-container rounded-lg px-3 py-2 text-body-sm text-on-surface-variant mb-4">
                <LockOutlined style={{ fontSize: 15 }} />
                Contenu en lecture seule — statut « {STATUT_LABEL[commande.statut]} ».
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
              {/* Colonne gauche : lignes + totaux */}
              <div className="space-y-5">
                <section>
                  <h2 className={`${SECTION_LABEL} mb-2.5`}>Produits</h2>
                  <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
                    <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
                      <span className="flex-1">Produit</span>
                      <span className="w-24 flex-none text-right">Qté</span>
                      <span className="w-28 flex-none text-right">P.U.</span>
                      <span className="w-32 flex-none text-right">Total</span>
                      {editable && <span className="w-8 flex-none" />}
                    </div>

                    {commande.lignes.length === 0 && !editable && (
                      <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
                        Aucun produit dans cette commande.
                      </p>
                    )}

                    {commande.lignes.map((l) => (
                      <div
                        key={l.id}
                        className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-3 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline"
                      >
                        <span className="w-full md:flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="text-body-md font-medium text-on-surface">
                              {l.produit_nom}
                            </span>
                            {l.paye && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-member-active-container px-1.5 py-0.5 text-[11px] font-semibold text-member-active">
                                <CheckOutlined style={{ fontSize: 11 }} />
                                Payé
                              </span>
                            )}
                          </span>
                          {l.tva_applicable && tvaTaux > 0 && (
                            <span className="block text-label-md text-outline">
                              TVA {tvaTaux} % · {formatMontant(lineTva(l), deviseBase)}
                            </span>
                          )}
                        </span>

                        <span className="md:w-24 flex-none md:text-right">
                          {editable ? (
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={qtyDraft[l.id] ?? String(l.quantite)}
                              onChange={(e) =>
                                setQtyDraft((d) => ({ ...d, [l.id]: e.target.value }))
                              }
                              onBlur={(e) => changeQuantite(l.id, e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface text-right tabular-nums outline-none focus:border-primary transition-colors"
                            />
                          ) : (
                            <span className="tabular-nums text-body-sm text-on-surface-variant">
                              {formatQuantite(l.quantite)}
                            </span>
                          )}
                        </span>

                        <span className="md:w-28 flex-none md:text-right tabular-nums text-body-sm text-on-surface-variant">
                          {formatMontant(l.prix_unitaire, deviseBase)}
                        </span>
                        <span className="md:w-32 flex-none md:text-right tabular-nums text-body-md font-medium text-on-surface">
                          {formatMontant(lineTotal(l) + lineTva(l), deviseBase)}
                        </span>

                        {editable && (
                          <span className="w-8 flex-none text-right">
                            <button
                              onClick={() => removeLigne(l.id)}
                              title="Retirer"
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                            >
                              <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                            </button>
                          </span>
                        )}
                      </div>
                    ))}

                    {editable && (
                      <div className="px-4 md:px-5 py-3">
                        <SearchSelect<Produit>
                          key={ligneKey}
                          value={null}
                          placeholder="Ajouter un produit…"
                          fetchOptions={(q) =>
                            listProduits({ q: q || undefined, page_size: 10 }).then((p) => p.items)
                          }
                          getOptionLabel={(p) => p.nom}
                          getOptionValue={(p) => p.id}
                          onChange={(v) => {
                            if (v !== null) addProduit(Number(v));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* Totaux et avancement du paiement */}
                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
                  <div className="space-y-2">
                    <TotalRow label="Sous-total" value={formatMontant(totaux.sousTotal, deviseBase)} />
                    {tvaTaux > 0 && (
                      <TotalRow label={`TVA (${tvaTaux} %)`} value={formatMontant(totaux.tva, deviseBase)} />
                    )}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-hairline">
                      <span className="text-body-md font-semibold text-on-surface">Total</span>
                      <span className="text-body-lg font-semibold text-on-surface tabular-nums">
                        {formatMontant(totaux.total, deviseBase)}
                      </span>
                    </div>
                    {devises.length > 0 && grandTotal > 0 && (
                      <p className="text-label-md text-outline text-right">
                        {conversions(grandTotal, devises)}
                      </p>
                    )}
                  </div>

                  {commande.lignes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-hairline">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-body-sm text-on-surface-variant">
                          Payé{" "}
                          <span className="text-outline">
                            {totaux.lignesPayees}/{commande.lignes.length} lignes
                          </span>
                        </span>
                        <span className="text-body-sm font-semibold text-on-surface">{pct} %</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-track mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? "bg-secondary" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-2 text-body-sm">
                        <span className="text-on-surface-variant">
                          Encaissé {formatMontant(totaux.paye, deviseBase)}
                        </span>
                        <span
                          className={
                            totaux.restant > 0 ? "font-semibold text-error" : "text-member-active"
                          }
                        >
                          {totaux.restant > 0
                            ? `Reste ${formatMontant(totaux.restant, deviseBase)}`
                            : "Soldée"}
                        </span>
                      </div>
                    </div>
                  )}

                  {devises.length > 0 && grandTotal > 0 && (
                    <p className="text-label-md text-outline mt-3">
                      Taux : {tauxNote(deviseBase, devises)} — définis dans Paramètres › Devise.
                    </p>
                  )}
                </section>
              </div>

              {/* Colonne droite : client, factures, notes */}
              <div className="space-y-5">
                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
                  <h2 className={`${SECTION_LABEL} mb-2.5`}>Client</h2>
                  {editable ? (
                    <SearchSelect<Client>
                      value={commande.client_id}
                      initialLabel={commande.client?.nom}
                      placeholder="Rechercher un client…"
                      fetchOptions={(q) =>
                        listClients({ q: q || undefined, page_size: 10 }).then((p) => p.items)
                      }
                      getOptionLabel={(c) => c.nom}
                      getOptionValue={(c) => c.id}
                      onChange={(v) => patchCommande({ client_id: v === null ? null : Number(v) })}
                      onCreate={async (nom) => {
                        const c = await createClient({ nom });
                        await patchCommande({ client_id: c.id });
                      }}
                      createLabel={(q) => `Créer le client « ${q} »`}
                    />
                  ) : commande.client ? (
                    <Link
                      href={`/clients/${commande.client.id}`}
                      className="inline-flex items-center gap-1.5 text-body-md font-medium text-on-surface hover:text-primary transition-colors"
                    >
                      {commande.client.nom}
                      <OpenInNewOutlined style={{ fontSize: 14 }} className="text-outline" />
                    </Link>
                  ) : (
                    <p className="text-body-md text-outline">—</p>
                  )}

                  {commande.client && (
                    <div className="flex flex-col gap-1 mt-3">
                      <Meta
                        icon={<EmailOutlined style={{ fontSize: 15 }} />}
                        value={commande.client.email}
                      />
                      <Meta
                        icon={<PhoneOutlined style={{ fontSize: 15 }} />}
                        value={commande.client.telephone}
                      />
                      <Meta
                        icon={<PlaceOutlined style={{ fontSize: 15 }} />}
                        value={commande.client.adresse_ville}
                      />
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-hairline">
                    <p className={`${SECTION_LABEL} mb-1.5`}>Date de la commande</p>
                    {editable ? (
                      <input
                        type="date"
                        value={commande.date_commande ?? ""}
                        onChange={(e) => patchCommande({ date_commande: e.target.value || null })}
                        className="w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
                      />
                    ) : (
                      <p className="text-body-md text-on-surface">{commande.date_commande ?? "—"}</p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
                  <h2 className={`${SECTION_LABEL} px-4 md:px-5 pt-4 pb-2.5`}>
                    Factures{" "}
                    {commande.factures.length > 0 && (
                      <span className="text-outline">{commande.factures.length}</span>
                    )}
                  </h2>
                  {commande.factures.length === 0 ? (
                    <p className="px-4 md:px-5 pb-4 text-body-sm text-on-surface-variant">
                      Aucune facture émise.
                    </p>
                  ) : (
                    commande.factures.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setOpenFactureId(f.id)}
                        className="w-full flex items-center gap-3 px-4 md:px-5 py-3 text-left border-t border-hairline hover:bg-surface-container-low transition-colors"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block font-mono text-label-md text-outline">{f.code}</span>
                          <span className="block text-body-sm text-on-surface-variant">
                            {f.date_facture ?? "—"}
                            {f.mode_paiement
                              ? ` · ${MODE_LABEL[f.mode_paiement] ?? f.mode_paiement}`
                              : ""}
                          </span>
                        </span>
                        <span className="text-body-sm font-medium text-on-surface tabular-nums">
                          {formatMontant(f.montant_total, deviseBase)}
                        </span>
                      </button>
                    ))
                  )}
                </section>

                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
                  <h2 className={`${SECTION_LABEL} mb-2.5`}>Notes</h2>
                  {canManage ? (
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      onBlur={() => {
                        if ((commande.notes ?? "") !== notesDraft) {
                          patchCommande({ notes: notesDraft || null });
                        }
                      }}
                      rows={3}
                      placeholder="Note interne sur cette commande…"
                      className="w-full px-3 py-2.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface resize-none outline-none focus:border-primary transition-colors"
                    />
                  ) : (
                    <p className="text-body-sm text-on-surface-variant whitespace-pre-line">
                      {commande.notes || "—"}
                    </p>
                  )}
                </section>
              </div>
            </div>

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

            {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      <span className="text-body-sm text-on-surface tabular-nums">{value}</span>
    </div>
  );
}
