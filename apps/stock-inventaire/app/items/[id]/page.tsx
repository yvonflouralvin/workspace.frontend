"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { Tabs } from "@repo/ui/Tabs";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  getItem,
  updateItem,
  deactivateItem,
  listCategories,
  listMouvements,
  createMouvement,
  UNITES,
  TYPE_ITEM_LABELS,
  TYPE_MOUVEMENT_LABELS,
  type ItemDetail,
  type ItemUpdateInput,
  type TypeItem,
  type CategorieDetail,
  type MouvementOut,
  type TypeMouvement,
} from "@/lib/stock-api";
import {
  ArrowBackOutlined,
  EditOutlined,
  BlockOutlined,
  WarningAmberOutlined,
  AddOutlined,
} from "@mui/icons-material";

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

const TYPE_COLORS: Record<TypeItem, string> = {
  PRODUIT: "bg-primary/10 text-primary",
  MATERIEL: "bg-tertiary/10 text-tertiary",
  SERVICE: "bg-secondary/10 text-secondary",
  PRESTATION: "bg-secondary/10 text-secondary",
  TELECHARGEABLE: "bg-outline/10 text-on-surface-variant",
};

const MOUVEMENT_COLORS: Record<TypeMouvement, string> = {
  ENTREE: "text-secondary",
  SORTIE: "text-error",
  AJUSTEMENT: "text-tertiary",
};

function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <span className="text-body-md text-on-surface">{value ?? "—"}</span>
    </div>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can("stock.items.manage");
  const canMouvements = can("stock.mouvements.create");
  const canViewMouvements = can("stock.mouvements.view");

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [categories, setCategories] = useState<CategorieDetail[]>([]);
  const [mouvements, setMouvements] = useState<MouvementOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ItemUpdateInput>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showMouvModal, setShowMouvModal] = useState(false);
  const [mouvForm, setMouvForm] = useState<{
    type_mouvement: TypeMouvement;
    quantite: string;
    reference: string;
    notes: string;
  }>({ type_mouvement: "ENTREE", quantite: "", reference: "", notes: "" });
  const [mouvSaving, setMouvSaving] = useState(false);
  const [mouvError, setMouvError] = useState<string | null>(null);

  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  useEffect(() => {
    Promise.all([getItem(Number(id)), listCategories(true)])
      .then(([itemData, cats]) => {
        setItem(itemData);
        setCategories(cats);
      })
      .catch(() => setError("Article introuvable"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (item && canViewMouvements && item.gestion_stock) {
      listMouvements(item.id).then(setMouvements).catch(() => {});
    }
  }, [item, canViewMouvements]);

  function openEdit() {
    if (!item) return;
    setForm({
      type: item.type,
      categorie_id: item.categorie_id,
      nom: item.nom,
      description: item.description ?? "",
      reference: item.reference ?? "",
      unite: item.unite,
      gestion_stock: item.gestion_stock,
      stock_minimum: item.stock_minimum,
      est_vendu: item.est_vendu,
      prix_vente: item.prix_vente,
      tva_taux: item.tva_taux,
      notes: item.notes ?? "",
    });
    setSaveError(null);
    setEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (form.est_vendu && (form.prix_vente == null || Number(form.prix_vente) <= 0)) {
      setSaveError("Un prix de vente valide est obligatoire pour un article vendu.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateItem(item.id, {
        ...form,
        description: (form.description as string) || undefined,
        reference: (form.reference as string) || undefined,
        notes: (form.notes as string) || undefined,
      });
      setItem(updated);
      setEditOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!item) return;
    setDeactivating(true);
    try {
      await deactivateItem(item.id);
      router.push("/items");
    } catch {
      setDeactivating(false);
      setConfirmDeactivate(false);
    }
  }

  async function handleMouvement(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const qty = Number(mouvForm.quantite);
    if (!qty || qty <= 0) { setMouvError("Quantité invalide"); return; }
    setMouvSaving(true);
    setMouvError(null);
    try {
      await createMouvement(item.id, {
        type_mouvement: mouvForm.type_mouvement,
        quantite: qty,
        reference: mouvForm.reference || undefined,
        notes: mouvForm.notes || undefined,
      });
      const [updatedItem, updatedMouvements] = await Promise.all([
        getItem(item.id),
        listMouvements(item.id),
      ]);
      setItem(updatedItem);
      setMouvements(updatedMouvements);
      setShowMouvModal(false);
      setMouvForm({ type_mouvement: "ENTREE", quantite: "", reference: "", notes: "" });
    } catch (err) {
      setMouvError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setMouvSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-8 text-body-md text-on-surface-variant">Chargement…</div>
      </DashboardShell>
    );
  }
  if (!item) {
    return (
      <DashboardShell>
        <div className="p-8 text-body-md text-error">{error}</div>
      </DashboardShell>
    );
  }

  const stockAlert =
    item.gestion_stock && item.stock_minimum != null && item.stock_actuel <= item.stock_minimum;

  const generalTab = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <ReadField
          label="Type"
          value={
            <span className={`inline-flex px-2 py-0.5 rounded-full text-label-md font-medium ${TYPE_COLORS[item.type]}`}>
              {TYPE_ITEM_LABELS[item.type]}
            </span>
          }
        />
        <ReadField label="Catégorie" value={item.categorie_nom} />
        <ReadField label="Référence / SKU" value={item.reference} />
        <ReadField label="Unité" value={item.unite} />
      </div>
      {item.description && <ReadField label="Description" value={item.description} />}
      {item.notes && (
        <ReadField label="Notes" value={<span className="whitespace-pre-line">{item.notes}</span>} />
      )}
    </div>
  );

  const stockTab = (
    <div className="space-y-6">
      {item.gestion_stock ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-label-md text-on-surface-variant">Stock actuel</span>
              <span className={`text-body-md font-semibold flex items-center gap-1 ${stockAlert ? "text-error" : "text-on-surface"}`}>
                {stockAlert && <WarningAmberOutlined style={{ fontSize: 14 }} />}
                {Number(item.stock_actuel)} {item.unite}
              </span>
            </div>
            <ReadField
              label="Seuil d'alerte"
              value={item.stock_minimum != null ? `${Number(item.stock_minimum)} ${item.unite}` : undefined}
            />
          </div>

          {canViewMouvements && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-body-md font-semibold text-on-surface">Mouvements</h2>
                {canMouvements && (
                  <button
                    onClick={() => setShowMouvModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-body-sm border border-outline-variant hover:bg-surface-container transition-colors"
                  >
                    <AddOutlined style={{ fontSize: 16 }} />
                    Nouveau mouvement
                  </button>
                )}
              </div>

              {showMouvModal && (
                <form
                  onSubmit={handleMouvement}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3"
                >
                  {mouvError && <p className="text-body-sm text-error">{mouvError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-label-md text-on-surface-variant">Type</label>
                      <select
                        value={mouvForm.type_mouvement}
                        onChange={(e) => setMouvForm((f) => ({ ...f, type_mouvement: e.target.value as TypeMouvement }))}
                        className={inputCls}
                      >
                        <option value="ENTREE">Entrée</option>
                        <option value="SORTIE">Sortie</option>
                        <option value="AJUSTEMENT">Ajustement (nouvelle quantité)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-label-md text-on-surface-variant">
                        {mouvForm.type_mouvement === "AJUSTEMENT" ? "Nouvelle quantité" : "Quantité"}
                      </label>
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={mouvForm.quantite}
                        onChange={(e) => setMouvForm((f) => ({ ...f, quantite: e.target.value }))}
                        placeholder={`En ${item.unite}`}
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant">Référence (BL, BC…)</label>
                    <input
                      type="text"
                      value={mouvForm.reference}
                      onChange={(e) => setMouvForm((f) => ({ ...f, reference: e.target.value }))}
                      placeholder="Optionnel"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowMouvModal(false); setMouvError(null); }}
                      className="px-3 py-1.5 text-body-sm border border-outline-variant rounded-xl hover:bg-surface-container transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={mouvSaving}
                      className="px-4 py-1.5 bg-primary text-on-primary text-body-sm rounded-xl font-medium disabled:opacity-60 transition-colors"
                    >
                      {mouvSaving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </div>
                </form>
              )}

              {mouvements.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">Aucun mouvement enregistré.</p>
              ) : (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <th className="text-left px-4 py-2 text-label-md text-on-surface-variant">Date</th>
                        <th className="text-left px-4 py-2 text-label-md text-on-surface-variant">Type</th>
                        <th className="text-right px-4 py-2 text-label-md text-on-surface-variant">Quantité</th>
                        <th className="text-right px-4 py-2 text-label-md text-on-surface-variant">Avant</th>
                        <th className="text-right px-4 py-2 text-label-md text-on-surface-variant">Après</th>
                        <th className="text-left px-4 py-2 text-label-md text-on-surface-variant">Référence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mouvements.map((m) => (
                        <tr key={m.id} className="border-b border-outline-variant/50 last:border-0">
                          <td className="px-4 py-2 text-on-surface-variant">
                            {new Date(m.created_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className={`px-4 py-2 font-medium ${MOUVEMENT_COLORS[m.type_mouvement]}`}>
                            {TYPE_MOUVEMENT_LABELS[m.type_mouvement]}
                          </td>
                          <td className={`px-4 py-2 text-right font-medium ${MOUVEMENT_COLORS[m.type_mouvement]}`}>
                            {m.type_mouvement === "SORTIE" ? "−" : "+"}{Number(m.quantite)} {item.unite}
                          </td>
                          <td className="px-4 py-2 text-right text-on-surface-variant">{Number(m.stock_avant)}</td>
                          <td className="px-4 py-2 text-right text-on-surface font-medium">{Number(m.stock_apres)}</td>
                          <td className="px-4 py-2 text-on-surface-variant font-mono">{m.reference ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-body-sm text-on-surface-variant">Gestion du stock désactivée pour cet article.</p>
      )}
    </div>
  );

  const venteTab = (
    <div className="space-y-4">
      {item.est_vendu ? (
        <div className="grid grid-cols-2 gap-4">
          <ReadField
            label="Prix de vente"
            value={item.prix_vente != null ? `${Number(item.prix_vente).toLocaleString("fr-CD")} CDF` : undefined}
          />
          <ReadField
            label="Taux TVA"
            value={item.tva_taux != null ? `${Number(item.tva_taux)}%` : undefined}
          />
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant">Cet article n&apos;est pas vendu.</p>
      )}
    </div>
  );

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/items" className="text-on-surface-variant hover:text-on-surface transition-colors">
              <ArrowBackOutlined style={{ fontSize: 20 }} />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-headline-md font-display text-on-surface">{item.nom}</h1>
                <span className={`px-2 py-0.5 rounded-full text-label-md font-medium ${TYPE_COLORS[item.type]}`}>
                  {TYPE_ITEM_LABELS[item.type]}
                </span>
                {!item.is_active && (
                  <span className="px-2 py-0.5 rounded-full text-label-md font-medium bg-error/10 text-error">
                    Inactif
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant font-mono mt-0.5">{item.code}</p>
            </div>
          </div>
          {canManage && item.is_active && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-md border border-outline-variant hover:bg-surface-container transition-colors"
              >
                <EditOutlined style={{ fontSize: 16 }} />
                Modifier
              </button>
              <button
                onClick={() => setConfirmDeactivate(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-md text-error border border-error/30 hover:bg-error/5 transition-colors"
              >
                <BlockOutlined style={{ fontSize: 16 }} />
                Désactiver
              </button>
            </div>
          )}
        </div>

        {confirmDeactivate && (
          <div className="bg-error-container/30 border border-error/20 rounded-xl p-4 space-y-3">
            <p className="text-body-md text-on-surface font-medium">Désactiver cet article ?</p>
            <p className="text-body-sm text-on-surface-variant">
              L&apos;article sera masqué du catalogue mais les données seront conservées.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-error text-on-error text-body-sm font-medium disabled:opacity-60 transition-colors"
              >
                {deactivating ? "En cours…" : "Confirmer"}
              </button>
              <button
                onClick={() => setConfirmDeactivate(false)}
                className="px-4 py-2 rounded-xl text-body-sm border border-outline-variant hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <Tabs
          tabs={[
            { key: "general", label: "Général", content: generalTab },
            { key: "stock", label: "Stock", content: stockTab },
            { key: "vente", label: "Vente", content: venteTab },
          ]}
        />
      </div>

      {editOpen && (
        <RightDrawer
          title="Modifier l'article"
          onClose={() => setEditOpen(false)}
          contentClassName="px-6 py-5 overflow-y-auto"
        >
          <form onSubmit={handleSave} className="space-y-6">
            {saveError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{saveError}</p>
            )}

            <div>
              <p className="text-body-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
                Identification
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant">Type *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TypeItem }))}
                      className={inputCls}
                    >
                      <option value="PRODUIT">Produit</option>
                      <option value="MATERIEL">Matériel</option>
                      <option value="SERVICE">Service</option>
                      <option value="PRESTATION">Prestation</option>
                      <option value="TELECHARGEABLE">Téléchargeable</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant">Catégorie</label>
                    <select
                      value={form.categorie_id ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, categorie_id: e.target.value ? Number(e.target.value) : null }))
                      }
                      className={inputCls}
                    >
                      <option value="">— Aucune —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-md text-on-surface-variant">Nom *</label>
                  <input
                    type="text"
                    value={form.nom as string}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-md text-on-surface-variant">Description</label>
                  <textarea
                    value={form.description as string}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant">Référence / SKU</label>
                    <input
                      type="text"
                      value={form.reference as string}
                      onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant">Unité</label>
                    <select
                      value={form.unite as string}
                      onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))}
                      className={inputCls}
                    >
                      {UNITES.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-body-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
                Stock
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.gestion_stock}
                    onChange={(e) => setForm((f) => ({ ...f, gestion_stock: e.target.checked }))}
                    className="h-4 w-4 rounded border-outline-variant text-primary"
                  />
                  <span className="text-body-md text-on-surface">Gestion du stock activée</span>
                </label>
                {form.gestion_stock && (
                  <div className="flex flex-col gap-1 pl-7">
                    <label className="text-label-md text-on-surface-variant">Seuil d&apos;alerte</label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={form.stock_minimum ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, stock_minimum: e.target.value ? Number(e.target.value) : null }))
                      }
                      placeholder="Optionnel"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-body-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">
                Vente
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.est_vendu}
                    onChange={(e) => setForm((f) => ({ ...f, est_vendu: e.target.checked }))}
                    className="h-4 w-4 rounded border-outline-variant text-primary"
                  />
                  <span className="text-body-md text-on-surface">Article vendu aux clients</span>
                </label>
                {form.est_vendu && (
                  <div className="grid grid-cols-2 gap-3 pl-7">
                    <div className="flex flex-col gap-1">
                      <label className="text-label-md text-on-surface-variant">Prix de vente (CDF) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.prix_vente ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, prix_vente: e.target.value ? Number(e.target.value) : null }))
                        }
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-label-md text-on-surface-variant">Taux TVA (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form.tva_taux ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, tva_taux: e.target.value ? Number(e.target.value) : null }))
                        }
                        placeholder="Optionnel"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Notes</label>
              <textarea
                value={form.notes as string}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            <div className="flex items-center gap-3 pb-4">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container disabled:opacity-60 transition-colors"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}
