"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { createTiers, type TiersCreateInput, type TypeTiers, type CategorieTiers } from "@/lib/tiers-api";
import { ArrowBackOutlined } from "@mui/icons-material";

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md font-medium text-on-surface-variant">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-body-md font-semibold text-on-surface border-b border-outline-variant pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function NewTiersPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can("tiers.tiers.create");

  const [form, setForm] = useState<TiersCreateInput>({
    type: "CLIENT",
    categorie: "ENTREPRISE",
    nom: "",
    email: "",
    telephone: "",
    telephone2: "",
    adresse_ligne1: "",
    adresse_ville: "",
    adresse_province: "",
    adresse_pays: "",
    numero_contribuable: "",
    rccm: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof TiersCreateInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true);
    setError(null);
    try {
      const created = await createTiers({
        ...form,
        email: form.email || undefined,
        telephone: form.telephone || undefined,
        telephone2: form.telephone2 || undefined,
        adresse_ligne1: form.adresse_ligne1 || undefined,
        adresse_ville: form.adresse_ville || undefined,
        adresse_province: form.adresse_province || undefined,
        adresse_pays: form.adresse_pays || undefined,
        numero_contribuable: form.numero_contribuable || undefined,
        rccm: form.rccm || undefined,
        notes: form.notes || undefined,
      });
      router.push(`/tiers/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  if (!canCreate) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-2xl mx-auto">
          <p className="text-body-sm text-on-surface-variant">
            Vous n&apos;avez pas la permission de créer un tiers.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/tiers" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Nouveau tiers</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">Client, fournisseur ou les deux</p>
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
                  onChange={(e) => set("type", e.target.value as TypeTiers)}
                  className={inputCls}
                >
                  <option value="CLIENT">Client</option>
                  <option value="FOURNISSEUR">Fournisseur</option>
                  <option value="LES_DEUX">Client & Fournisseur</option>
                </select>
              </Field>
              <Field label="Catégorie" required>
                <select
                  value={form.categorie}
                  onChange={(e) => set("categorie", e.target.value as CategorieTiers)}
                  className={inputCls}
                >
                  <option value="ENTREPRISE">Entreprise</option>
                  <option value="PARTICULIER">Particulier</option>
                </select>
              </Field>
            </div>
            <Field label="Nom / Raison sociale" required>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                placeholder={form.categorie === "ENTREPRISE" ? "Ex : Acme SARL" : "Ex : Jean Dupont"}
                className={inputCls}
                required
              />
            </Field>
          </Section>

          <Section title="Coordonnées">
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contact@exemple.com" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone principal">
                <input type="tel" value={form.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder="+243 81 000 0000" className={inputCls} />
              </Field>
              <Field label="Téléphone secondaire">
                <input type="tel" value={form.telephone2} onChange={(e) => set("telephone2", e.target.value)} placeholder="+243 82 000 0000" className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section title="Adresse">
            <Field label="Adresse ligne 1">
              <input type="text" value={form.adresse_ligne1} onChange={(e) => set("adresse_ligne1", e.target.value)} placeholder="Rue, N° de bâtiment…" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ville">
                <input type="text" value={form.adresse_ville} onChange={(e) => set("adresse_ville", e.target.value)} placeholder="Kinshasa" className={inputCls} />
              </Field>
              <Field label="Province / Région">
                <input type="text" value={form.adresse_province} onChange={(e) => set("adresse_province", e.target.value)} placeholder="Kinshasa" className={inputCls} />
              </Field>
            </div>
            <Field label="Pays">
              <input type="text" value={form.adresse_pays} onChange={(e) => set("adresse_pays", e.target.value)} placeholder="République Démocratique du Congo" className={inputCls} />
            </Field>
          </Section>

          <Section title="Informations fiscales">
            <div className="grid grid-cols-2 gap-4">
              <Field label="N° Contribuable (NIF)">
                <input type="text" value={form.numero_contribuable} onChange={(e) => set("numero_contribuable", e.target.value)} placeholder="Ex : A1234567X" className={inputCls} />
              </Field>
              <Field label="RCCM">
                <input type="text" value={form.rccm} onChange={(e) => set("rccm", e.target.value)} placeholder="Ex : CD/KIN/RCCM/…" className={inputCls} />
              </Field>
            </div>
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
              href="/tiers"
              className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container disabled:opacity-60 transition-colors"
            >
              {saving ? "Enregistrement…" : "Créer le tiers"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
