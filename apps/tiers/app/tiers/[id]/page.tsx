"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getTiers,
  updateTiers,
  deactivateTiers,
  type TiersDetail,
  type TiersUpdateInput,
  type TypeTiers,
  type CategorieTiers,
} from "@/lib/tiers-api";
import { ArrowBackOutlined, EditOutlined, BlockOutlined } from "@mui/icons-material";

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:bg-surface-container";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md font-medium text-on-surface-variant">{label}</label>
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

const TYPE_LABELS: Record<TypeTiers, string> = {
  CLIENT: "Client",
  FOURNISSEUR: "Fournisseur",
  LES_DEUX: "Client & Fournisseur",
};
const TYPE_COLORS: Record<TypeTiers, string> = {
  CLIENT: "bg-tertiary/10 text-tertiary",
  FOURNISSEUR: "bg-secondary/10 text-secondary",
  LES_DEUX: "bg-primary/10 text-primary",
};

export default function TiersDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("tiers.tiers.manage");

  const [tiers, setTiers] = useState<TiersDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TiersUpdateInput>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getTiers(Number(id))
      .then((t) => { setTiers(t); setForm(tiersToForm(t)); })
      .catch(() => setError("Tiers introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  function tiersToForm(t: TiersDetail): TiersUpdateInput {
    return {
      type: t.type,
      categorie: t.categorie,
      nom: t.nom,
      email: t.email ?? "",
      telephone: t.telephone ?? "",
      telephone2: t.telephone2 ?? "",
      adresse_ligne1: t.adresse_ligne1 ?? "",
      adresse_ville: t.adresse_ville ?? "",
      adresse_province: t.adresse_province ?? "",
      adresse_pays: t.adresse_pays ?? "",
      numero_contribuable: t.numero_contribuable ?? "",
      rccm: t.rccm ?? "",
      notes: t.notes ?? "",
    };
  }

  function set(field: keyof TiersUpdateInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom?.trim()) { setSaveError("Le nom est obligatoire."); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateTiers(Number(id), {
        ...form,
        email: (form.email as string) || undefined,
        telephone: (form.telephone as string) || undefined,
        telephone2: (form.telephone2 as string) || undefined,
        adresse_ligne1: (form.adresse_ligne1 as string) || undefined,
        adresse_ville: (form.adresse_ville as string) || undefined,
        adresse_province: (form.adresse_province as string) || undefined,
        adresse_pays: (form.adresse_pays as string) || undefined,
        numero_contribuable: (form.numero_contribuable as string) || undefined,
        rccm: (form.rccm as string) || undefined,
        notes: (form.notes as string) || undefined,
      });
      setTiers(updated);
      setForm(tiersToForm(updated));
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!tiers) return;
    if (!confirm(`Désactiver « ${tiers.nom} » ? Cette action peut être annulée.`)) return;
    try {
      await deactivateTiers(Number(id));
      router.push("/tiers");
    } catch {
      setError("Impossible de désactiver ce tiers.");
    }
  }

  if (loading) return <DashboardShell><div className="p-8 text-body-sm text-on-surface-variant">Chargement…</div></DashboardShell>;
  if (error || !tiers) return <DashboardShell><div className="p-8 text-body-sm text-error">{error ?? "Tiers introuvable."}</div></DashboardShell>;

  const f = form as Record<string, string>;

  return (
    <DashboardShell>
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/tiers" className="text-on-surface-variant hover:text-on-surface transition-colors">
              <ArrowBackOutlined style={{ fontSize: 20 }} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-headline-md font-display text-on-surface">{tiers.nom}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium ${TYPE_COLORS[tiers.type]}`}>
                  {TYPE_LABELS[tiers.type]}
                </span>
                {!tiers.is_active && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-surface-container text-on-surface-variant">
                    Inactif
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant mt-0.5 font-mono">{tiers.code}</p>
            </div>
          </div>
          {canEdit && !editing && tiers.is_active && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <EditOutlined style={{ fontSize: 16 }} />
                Modifier
              </button>
              <button
                onClick={handleDeactivate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-error/30 text-body-sm text-error hover:bg-error-container/30 transition-colors"
              >
                <BlockOutlined style={{ fontSize: 16 }} />
                Désactiver
              </button>
            </div>
          )}
        </div>

        {saveError && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{saveError}</p>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          <Section title="Identification">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <select
                  value={f.type}
                  onChange={(e) => set("type", e.target.value)}
                  disabled={!editing}
                  className={inputCls}
                >
                  <option value="CLIENT">Client</option>
                  <option value="FOURNISSEUR">Fournisseur</option>
                  <option value="LES_DEUX">Client & Fournisseur</option>
                </select>
              </Field>
              <Field label="Catégorie">
                <select
                  value={f.categorie}
                  onChange={(e) => set("categorie", e.target.value)}
                  disabled={!editing}
                  className={inputCls}
                >
                  <option value="ENTREPRISE">Entreprise</option>
                  <option value="PARTICULIER">Particulier</option>
                </select>
              </Field>
            </div>
            <Field label="Nom / Raison sociale">
              <input type="text" value={f.nom} onChange={(e) => set("nom", e.target.value)} disabled={!editing} className={inputCls} required />
            </Field>
          </Section>

          <Section title="Coordonnées">
            <Field label="Email">
              <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} disabled={!editing} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone principal">
                <input type="tel" value={f.telephone} onChange={(e) => set("telephone", e.target.value)} disabled={!editing} className={inputCls} />
              </Field>
              <Field label="Téléphone secondaire">
                <input type="tel" value={f.telephone2} onChange={(e) => set("telephone2", e.target.value)} disabled={!editing} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section title="Adresse">
            <Field label="Adresse ligne 1">
              <input type="text" value={f.adresse_ligne1} onChange={(e) => set("adresse_ligne1", e.target.value)} disabled={!editing} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ville">
                <input type="text" value={f.adresse_ville} onChange={(e) => set("adresse_ville", e.target.value)} disabled={!editing} className={inputCls} />
              </Field>
              <Field label="Province / Région">
                <input type="text" value={f.adresse_province} onChange={(e) => set("adresse_province", e.target.value)} disabled={!editing} className={inputCls} />
              </Field>
            </div>
            <Field label="Pays">
              <input type="text" value={f.adresse_pays} onChange={(e) => set("adresse_pays", e.target.value)} disabled={!editing} className={inputCls} />
            </Field>
          </Section>

          <Section title="Informations fiscales">
            <div className="grid grid-cols-2 gap-4">
              <Field label="N° Contribuable (NIF)">
                <input type="text" value={f.numero_contribuable} onChange={(e) => set("numero_contribuable", e.target.value)} disabled={!editing} className={inputCls} />
              </Field>
              <Field label="RCCM">
                <input type="text" value={f.rccm} onChange={(e) => set("rccm", e.target.value)} disabled={!editing} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section title="Notes">
            <Field label="Notes internes">
              <textarea
                value={f.notes}
                onChange={(e) => set("notes", e.target.value)}
                disabled={!editing}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </Field>
          </Section>

          {editing && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setEditing(false); if (tiers) setForm(tiersToForm(tiers)); setSaveError(null); }}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container disabled:opacity-60 transition-colors"
              >
                {saving ? "Enregistrement…" : "Sauvegarder"}
              </button>
            </div>
          )}
        </form>
      </div>
    </DashboardShell>
  );
}
