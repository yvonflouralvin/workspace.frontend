"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ParametresLayout } from "@/components/ParametresLayout";
import { getParametre, updateParametre } from "@/lib/ventes-api";
import { ArrowBackOutlined, ImageOutlined, DeleteOutlineOutlined } from "@mui/icons-material";

interface OrgValeur {
  denomination: string;
  adresse: string;
  site_web: string;
  email: string;
  contact: string;
  numero_impot: string;
  rcc: string;
  logo: string;
}

const EMPTY: OrgValeur = {
  denomination: "", adresse: "", site_web: "", email: "",
  contact: "", numero_impot: "", rcc: "", logo: "",
};

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

const MAX_LOGO_BYTES = 800_000;

export default function OrganisationSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("ventes.settings.manage");

  const [form, setForm] = useState<OrgValeur>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    getParametre<OrgValeur>("organisation")
      .then((p) => setForm({ ...EMPTY, ...(p.valeur ?? {}) }))
      .catch(() => setError("Impossible de charger le paramètre Organisation."))
      .finally(() => setLoading(false));
  }, [canManage]);

  function set<K extends keyof OrgValeur>(key: K, value: OrgValeur[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("Le logo est trop volumineux (max 800 Ko). Choisissez une image plus légère.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { set("logo", String(reader.result)); setError(null); };
    reader.readAsDataURL(file);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateParametre<OrgValeur>("organisation", form);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ParametresLayout>
      <div className="space-y-5">

        <div>
          <h1 className="text-headline-md font-display text-on-surface">Organisation</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Identité de votre organisation. Ces informations apparaissent en haut des factures PDF
            (logo et coordonnées à gauche, client à droite).
          </p>
        </div>

        {!canManage && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de gérer les paramètres.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canManage && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canManage && !loading && (
          <form
            onSubmit={save}
            className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-5"
          >
            {/* Logo */}
            <div>
              <label className={labelCls}>Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl border border-outline-variant bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <ImageOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/50" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <ImageOutlined style={{ fontSize: 18 }} /> Choisir une image
                  </button>
                  {form.logo && (
                    <button
                      type="button"
                      onClick={() => set("logo", "")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-body-sm text-on-surface-variant hover:text-error transition-colors"
                    >
                      <DeleteOutlineOutlined style={{ fontSize: 18 }} /> Retirer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Dénomination</label>
              <input className={inputCls} value={form.denomination} onChange={(e) => set("denomination", e.target.value)} placeholder="Nom de l'organisation" />
            </div>
            <div>
              <label className={labelCls}>Adresse</label>
              <input className={inputCls} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} placeholder="Rue, ville, pays" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Contact (téléphone)</label>
                <input className={inputCls} value={form.contact} onChange={(e) => set("contact", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Site web</label>
                <input className={inputCls} value={form.site_web} onChange={(e) => set("site_web", e.target.value)} placeholder="https://" />
              </div>
              <div />
              <div>
                <label className={labelCls}>Numéro d&apos;impôt</label>
                <input className={inputCls} value={form.numero_impot} onChange={(e) => set("numero_impot", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>RCC</label>
                <input className={inputCls} value={form.rcc} onChange={(e) => set("rcc", e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center bg-primary text-on-primary text-body-md font-medium px-5 py-2 rounded-xl hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              {saved && <span className="text-body-sm text-secondary">Informations enregistrées.</span>}
            </div>
          </form>
        )}
      </div>
    </ParametresLayout>
  );
}
