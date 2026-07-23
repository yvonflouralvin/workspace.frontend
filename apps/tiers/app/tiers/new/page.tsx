"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  createTiers,
  type TiersCreateInput,
  type CategorieTiers,
  type TypeTiers,
} from "@/lib/tiers-api";
import {
  ArrowBackOutlined,
  BusinessOutlined,
  PersonOutlined,
  CheckCircleOutlined,
} from "@mui/icons-material";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className={LABEL}>
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
      <h2 className="text-body-md font-semibold text-on-surface mb-3">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const NATURES: {
  value: CategorieTiers;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "ENTREPRISE",
    title: "Entreprise",
    description: "Raison sociale, RCCM et numéro contribuable.",
    icon: <BusinessOutlined style={{ fontSize: 22 }} />,
  },
  {
    value: "PARTICULIER",
    title: "Particulier",
    description: "Nom complet et coordonnées personnelles.",
    icon: <PersonOutlined style={{ fontSize: 22 }} />,
  },
];

const TYPES: { value: TypeTiers; label: string }[] = [
  { value: "CLIENT", label: "Client" },
  { value: "FOURNISSEUR", label: "Fournisseur" },
  { value: "LES_DEUX", label: "Client & fournisseur" },
];

export default function NewTiersPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can("tiers.tiers.create");

  // La nature se choisit d'abord : elle décide de la forme du formulaire.
  const [nature, setNature] = useState<CategorieTiers | null>(null);
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

  function chooseNature(value: CategorieTiers) {
    setNature(value);
    setForm((f) => ({ ...f, categorie: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v])
      ) as TiersCreateInput;
      const created = await createTiers(payload);
      router.push(`/tiers/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setSaving(false);
    }
  }

  if (!canCreate) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
          <h1 className="font-display text-headline-md text-on-surface">Nouveau tiers</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Vous n&apos;avez pas la permission de créer un tiers.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const entreprise = nature === "ENTREPRISE";

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[760px] mx-auto">
        <Link
          href="/tiers"
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Tiers
        </Link>

        <h1 className="font-display text-headline-md text-on-surface">Nouveau tiers</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5 mb-5">
          {nature
            ? "Renseignez la fiche. Vous pourrez la compléter plus tard."
            : "De quelle nature s'agit-il ? Le formulaire s'adapte."}
        </p>

        {!nature ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {NATURES.map((n) => (
              <button
                key={n.value}
                type="button"
                onClick={() => chooseNature(n.value)}
                className="text-left rounded-2xl border border-outline-soft bg-surface-container-lowest p-5 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
              >
                <span className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {n.icon}
                </span>
                <p className="font-display text-body-lg font-semibold text-on-surface mt-3">
                  {n.title}
                </p>
                <p className="text-body-sm text-on-surface-variant mt-1">{n.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="flex items-center gap-2.5 rounded-xl border border-outline-soft bg-surface-container-low px-4 py-3">
              <CheckCircleOutlined style={{ fontSize: 18 }} className="flex-none text-primary" />
              <span className="flex-1 text-body-sm text-on-surface">
                {entreprise ? "Entreprise" : "Particulier"}
              </span>
              <button
                type="button"
                onClick={() => setNature(null)}
                className="text-label-md font-semibold text-primary hover:underline"
              >
                Changer
              </button>
            </div>

            {error && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Section title="Identité">
              <Field label={entreprise ? "Raison sociale" : "Nom complet"} required>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => set("nom", e.target.value)}
                  placeholder={entreprise ? "Congo Distribution SARL" : "Louise Kasongo"}
                  className={FIELD}
                  autoFocus
                  required
                />
              </Field>
              <Field label="Relation">
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set("type", t.value)}
                      className={`h-10 px-3.5 rounded-lg border text-body-sm font-semibold transition-colors ${
                        form.type === t.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            <Section title="Contact">
              <Field label="Email">
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  className={FIELD}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Téléphone">
                  <input
                    type="tel"
                    value={form.telephone ?? ""}
                    onChange={(e) => set("telephone", e.target.value)}
                    className={FIELD}
                  />
                </Field>
                <Field label="Téléphone secondaire">
                  <input
                    type="tel"
                    value={form.telephone2 ?? ""}
                    onChange={(e) => set("telephone2", e.target.value)}
                    className={FIELD}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Adresse">
              <Field label="Adresse">
                <input
                  type="text"
                  value={form.adresse_ligne1 ?? ""}
                  onChange={(e) => set("adresse_ligne1", e.target.value)}
                  className={FIELD}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Ville">
                  <input
                    type="text"
                    value={form.adresse_ville ?? ""}
                    onChange={(e) => set("adresse_ville", e.target.value)}
                    className={FIELD}
                  />
                </Field>
                <Field label="Province">
                  <input
                    type="text"
                    value={form.adresse_province ?? ""}
                    onChange={(e) => set("adresse_province", e.target.value)}
                    className={FIELD}
                  />
                </Field>
                <Field label="Pays">
                  <input
                    type="text"
                    value={form.adresse_pays ?? ""}
                    onChange={(e) => set("adresse_pays", e.target.value)}
                    className={FIELD}
                  />
                </Field>
              </div>
            </Section>

            {entreprise && (
              <Section title="Informations légales">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="N° contribuable (NIF)">
                    <input
                      type="text"
                      value={form.numero_contribuable ?? ""}
                      onChange={(e) => set("numero_contribuable", e.target.value)}
                      className={`${FIELD} font-mono`}
                    />
                  </Field>
                  <Field label="RCCM">
                    <input
                      type="text"
                      value={form.rccm ?? ""}
                      onChange={(e) => set("rccm", e.target.value)}
                      className={`${FIELD} font-mono`}
                    />
                  </Field>
                </div>
              </Section>
            )}

            <Section title="Notes">
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Notes internes…"
                className={`${FIELD} resize-none`}
              />
            </Section>

            <div className="flex items-center justify-end gap-2.5">
              <Link
                href="/tiers"
                className="h-11 md:h-[38px] inline-flex items-center px-4 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="h-11 md:h-[38px] px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                {saving ? "Création…" : "Créer le tiers"}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
