"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  createItem,
  listCategories,
  UNITES,
  type ItemCreateInput,
  type TypeItem,
  type CategorieDetail,
} from "@/lib/stock-api";
import { ArrowBackOutlined } from "@mui/icons-material";

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

const checkboxCls =
  "h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-body-md font-semibold text-on-surface border-b border-outline-variant pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md font-medium text-on-surface-variant">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-label-sm text-on-surface-variant/70">{hint}</p>}
    </div>
  );
}

const DEFAULT_GESTION_STOCK: Record<TypeItem, boolean> = {
  PRODUIT: true,
  MATERIEL: true,
  SERVICE: false,
  PRESTATION: false,
  TELECHARGEABLE: false,
};

export default function NewItemPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can("stock.items.create");

  const [categories, setCategories] = useState<CategorieDetail[]>([]);
  const [form, setForm] = useState<ItemCreateInput>({
    type: "PRODUIT",
    categorie_id: null,
    nom: "",
    description: "",
    reference: "",
    unite: "pcs",
    gestion_stock: true,
    stock_actuel: 0,
    stock_minimum: null,
    est_vendu: false,
    prix_vente: null,
    tva_taux: null,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories(true).then(setCategories).catch(() => {});
  }, []);

  function set<K extends keyof ItemCreateInput>(field: K, value: ItemCreateInput[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleTypeChange(type: TypeItem) {
    setForm((f) => ({
      ...f,
      type,
      gestion_stock: DEFAULT_GESTION_STOCK[type],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    if (form.est_vendu && (form.prix_vente == null || form.prix_vente <= 0)) {
      setError("Un prix de vente valide est obligatoire pour un article vendu."); return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createItem({
        ...form,
        description: form.description || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        stock_minimum: form.stock_minimum ?? undefined,
        prix_vente: form.prix_vente ?? undefined,
        tva_taux: form.tva_taux ?? undefined,
      });
      router.push(`/items/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  if (!canCreate) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-2xl mx-auto">
          <p className="text-body-sm text-on-surface-variant">Vous n&apos;avez pas la permission de créer un article.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/items" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Nouvel article</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Produit, matériel, service ou prestation</p>
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <Section title="Identification">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type" required>
                <select
                  value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value as TypeItem)}
                  className={inputCls}
                >
                  <option value="PRODUIT">Produit</option>
                  <option value="MATERIEL">Matériel</option>
                  <option value="SERVICE">Service</option>
                  <option value="PRESTATION">Prestation</option>
                  <option value="TELECHARGEABLE">Téléchargeable</option>
                </select>
              </Field>
              <Field label="Catégorie">
                <select
                  value={form.categorie_id ?? ""}
                  onChange={(e) => set("categorie_id", e.target.value ? Number(e.target.value) : null)}
                  className={inputCls}
                >
                  <option value="">— Aucune catégorie —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Nom" required>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                placeholder="Ex : Stylo Bic bleu, Consultation médicale…"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                placeholder="Description détaillée…"
                className={`${inputCls} resize-none`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Référence / SKU" hint="Code interne ou référence fournisseur">
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => set("reference", e.target.value)}
                  placeholder="Ex : SKU-0042"
                  className={inputCls}
                />
              </Field>
              <Field label="Unité de mesure" required>
                <select
                  value={form.unite}
                  onChange={(e) => set("unite", e.target.value)}
                  className={inputCls}
                >
                  {UNITES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Stock">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.gestion_stock}
                onChange={(e) => set("gestion_stock", e.target.checked)}
                className={checkboxCls}
              />
              <span className="text-body-md text-on-surface">Activer la gestion du stock pour cet article</span>
            </label>

            {form.gestion_stock && (
              <div className="grid grid-cols-2 gap-4 pl-7">
                <Field label="Quantité initiale en stock">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.stock_actuel ?? 0}
                    onChange={(e) => set("stock_actuel", Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Seuil d'alerte (minimum)" hint="Alerte si stock ≤ ce seuil">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.stock_minimum ?? ""}
                    onChange={(e) => set("stock_minimum", e.target.value ? Number(e.target.value) : null)}
                    placeholder="Optionnel"
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Vente">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.est_vendu}
                onChange={(e) => set("est_vendu", e.target.checked)}
                className={checkboxCls}
              />
              <span className="text-body-md text-on-surface">Cet article est vendu aux clients</span>
            </label>

            {form.est_vendu && (
              <div className="grid grid-cols-2 gap-4 pl-7">
                <Field label="Prix de vente (CDF)" required>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.prix_vente ?? ""}
                    onChange={(e) => set("prix_vente", e.target.value ? Number(e.target.value) : null)}
                    placeholder="Ex : 15000"
                    className={inputCls}
                  />
                </Field>
                <Field label="Taux TVA (%)" hint="Ex : 16 pour 16%">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.tva_taux ?? ""}
                    onChange={(e) => set("tva_taux", e.target.value ? Number(e.target.value) : null)}
                    placeholder="Optionnel"
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Notes">
            <Field label="Notes internes">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Informations complémentaires…"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </Section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/items"
              className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container disabled:opacity-60 transition-colors"
            >
              {saving ? "Enregistrement…" : "Créer l'article"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
