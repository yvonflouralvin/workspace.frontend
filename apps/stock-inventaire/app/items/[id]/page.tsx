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
  InfoOutlined,
  LockOutlined,
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

type GeneralFieldKey = "nom" | "type" | "categorie_id" | "reference" | "unite" | "gestion_stock" | "description" | "notes";
type EditKind = "type" | "categorie" | "unite" | "boolean" | "text" | "textarea";

interface GeneralField {
  key: GeneralFieldKey;
  label: string;
  lockKey?: string;
  editKind: EditKind;
  info: string;
}

const GENERAL_FIELDS: GeneralField[] = [
  { key: "nom", label: "Nom", lockKey: "nom", editKind: "text",
    info: "Le libellé de l'article tel qu'il apparaît dans le catalogue, les documents et les recherches." },
  { key: "type", label: "Type", lockKey: "type", editKind: "type",
    info: "Nature de l'article : produit, matériel, service, prestation ou téléchargeable. Détermine la gestion de stock et la facturation." },
  { key: "categorie_id", label: "Catégorie", lockKey: "categorie_id", editKind: "categorie",
    info: "Regroupe les articles similaires pour l'organisation et les filtres du catalogue." },
  { key: "reference", label: "Référence / SKU", editKind: "text",
    info: "Code de référence interne ou SKU fournisseur, pour identifier l'article de façon unique." },
  { key: "unite", label: "Unité", editKind: "unite",
    info: "Unité de mesure (pièce, kg, litre, heure…), utilisée pour les quantités et les mouvements de stock." },
  { key: "gestion_stock", label: "Gestion de stock", editKind: "boolean",
    info: "Si activée, l'article suit un stock (entrées, sorties, seuil d'alerte). Désactivée pour les services et prestations sans inventaire." },
  { key: "description", label: "Description", editKind: "textarea",
    info: "Description libre de l'article, visible sur le catalogue et les documents." },
  { key: "notes", label: "Notes", editKind: "textarea",
    info: "Notes internes sur l'article, non visibles par les clients." },
];

function fieldDisplay(item: ItemDetail, key: GeneralFieldKey): React.ReactNode {
  switch (key) {
    case "type":
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-label-md font-medium ${TYPE_COLORS[item.type]}`}>
          {TYPE_ITEM_LABELS[item.type]}
        </span>
      );
    case "nom": return item.nom;
    case "categorie_id": return item.categorie_nom ?? "—";
    case "reference": return item.reference ?? "—";
    case "unite": return item.unite;
    case "gestion_stock":
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-label-md font-medium ${item.gestion_stock ? "bg-secondary/10 text-secondary" : "bg-outline/10 text-on-surface-variant"}`}>
          {item.gestion_stock ? "Activée" : "Désactivée"}
        </span>
      );
    case "description": return item.description ?? "—";
    case "notes": return item.notes ? <span className="whitespace-pre-line">{item.notes}</span> : "—";
  }
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

  const [infoField, setInfoField] = useState<GeneralField | null>(null);
  const [editField, setEditField] = useState<GeneralField | null>(null);
  const [fieldValue, setFieldValue] = useState<string | number | boolean | null>(null);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

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

  function openFieldEdit(field: GeneralField) {
    if (!item) return;
    const current =
      field.key === "categorie_id" ? item.categorie_id
      : field.key === "type" ? item.type
      : field.key === "gestion_stock" ? item.gestion_stock
      : ((item[field.key] as string | null) ?? "");
    setFieldValue(current);
    setFieldError(null);
    setEditField(field);
  }

  async function saveField() {
    if (!item || !editField) return;
    setFieldSaving(true);
    setFieldError(null);
    try {
      const k = editField.key;
      let payload: ItemUpdateInput;
      if (k === "categorie_id") payload = { categorie_id: fieldValue != null && fieldValue !== "" ? Number(fieldValue) : null };
      else if (k === "type") payload = { type: fieldValue as TypeItem };
      else if (k === "gestion_stock") payload = { gestion_stock: Boolean(fieldValue) };
      else payload = { [k]: (fieldValue as string) || undefined } as ItemUpdateInput;
      const updated = await updateItem(item.id, payload);
      setItem(updated);
      setEditField(null);
    } catch (err) {
      setFieldError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setFieldSaving(false);
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
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant">
      {GENERAL_FIELDS.map((field) => {
        const locked =
          !!item.owner_app_key && !!field.lockKey && (item.locked_fields ?? []).includes(field.lockKey);
        return (
          <div key={field.key} className="flex items-center gap-4 px-4 py-3">
            <span className="text-label-md text-on-surface-variant w-40 shrink-0">{field.label}</span>
            <span className="text-body-md text-on-surface flex-1 min-w-0 break-words">
              {fieldDisplay(item, field.key)}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setInfoField(field)}
                title="Informations"
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <InfoOutlined style={{ fontSize: 16 }} />
              </button>
              {canManage && item.is_active && (
                locked ? (
                  <span
                    title={`Champ géré par « ${item.owner_app_key} » — verrouillé`}
                    className="p-1.5 flex items-center text-on-surface-variant/50"
                  >
                    <LockOutlined style={{ fontSize: 16 }} />
                  </span>
                ) : (
                  <button
                    onClick={() => openFieldEdit(field)}
                    title="Modifier"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <EditOutlined style={{ fontSize: 16 }} />
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
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
      <div className="p-6 max-w-5xl mx-auto space-y-6">
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
        </div>

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

      {infoField && (
        <RightDrawer
          title={infoField.label}
          onClose={() => setInfoField(null)}
          contentClassName="px-6 py-5"
        >
          <p className="text-body-md text-on-surface-variant leading-relaxed">{infoField.info}</p>
        </RightDrawer>
      )}

      {editField && (
        <RightDrawer
          title={`Modifier — ${editField.label}`}
          onClose={() => setEditField(null)}
          contentClassName="px-6 py-5"
        >
          <div className="space-y-4">
            {fieldError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{fieldError}</p>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">{editField.label}</label>
              {editField.editKind === "type" ? (
                <select value={String(fieldValue ?? "")} onChange={(e) => setFieldValue(e.target.value)} className={inputCls}>
                  <option value="PRODUIT">Produit</option>
                  <option value="MATERIEL">Matériel</option>
                  <option value="SERVICE">Service</option>
                  <option value="PRESTATION">Prestation</option>
                  <option value="TELECHARGEABLE">Téléchargeable</option>
                </select>
              ) : editField.editKind === "categorie" ? (
                <select
                  value={typeof fieldValue === "number" || typeof fieldValue === "string" ? fieldValue : ""}
                  onChange={(e) => setFieldValue(e.target.value ? Number(e.target.value) : null)}
                  className={inputCls}
                >
                  <option value="">— Aucune —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              ) : editField.editKind === "unite" ? (
                <select value={String(fieldValue ?? "")} onChange={(e) => setFieldValue(e.target.value)} className={inputCls}>
                  {UNITES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              ) : editField.editKind === "boolean" ? (
                <label className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={Boolean(fieldValue)}
                    onChange={(e) => setFieldValue(e.target.checked)}
                    className="h-4 w-4 rounded border-outline-variant text-primary"
                  />
                  <span className="text-body-md text-on-surface">
                    {fieldValue ? "Activée" : "Désactivée"}
                  </span>
                </label>
              ) : editField.editKind === "textarea" ? (
                <textarea
                  value={String(fieldValue ?? "")}
                  onChange={(e) => setFieldValue(e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <input
                  type="text"
                  value={String(fieldValue ?? "")}
                  onChange={(e) => setFieldValue(e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditField(null)}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveField}
                disabled={fieldSaving}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container disabled:opacity-60 transition-colors"
              >
                {fieldSaving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}
