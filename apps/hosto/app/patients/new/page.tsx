"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { createPatient, type ContactInput, type PatientCreateInput } from "@/app/lib/api";
import { AddOutlined, DeleteOutlined, ArrowBackOutlined } from "@mui/icons-material";
import Link from "next/link";

const RELATIONS = [
  "Père",
  "Mère",
  "Conjoint(e)",
  "Enfant",
  "Tuteur légal",
  "Ami(e)",
  "Employeur",
  "Autre",
];

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
    <div className="flex flex-col gap-1">
      <label className="text-label-md font-medium text-on-surface-variant">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

const emptyContact = (): ContactInput => ({
  full_name: "",
  relation: "",
  phone: "",
  email: "",
  adresse: "",
  is_emergency: false,
  is_primary: false,
});

export default function NewPatientPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can("hosto.patients.create");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PatientCreateInput>({
    nom: "",
    postnom: "",
    prenom: "",
    sexe: "",
    date_naissance: "",
    lieu_naissance_ville: "",
    lieu_naissance_province: "",
    lieu_naissance_pays: "",
    adresse_ligne1: "",
    adresse_quartier: "",
    adresse_ville: "",
    adresse_province: "",
    adresse_pays: "",
    contacts: [],
  });

  const [contacts, setContacts] = useState<ContactInput[]>([]);

  function setField(key: keyof PatientCreateInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addContact() {
    setContacts((prev) => [...prev, emptyContact()]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function setContactField(index: number, key: keyof ContactInput, value: string | boolean) {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [key]: value } : c))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await createPatient({ ...form, contacts });
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  if (!canCreate) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-2xl mx-auto">
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Vous n&apos;avez pas la permission d&apos;enregistrer un patient.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Nouveau patient</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Remplissez les informations du patient. Les champs marqués * sont obligatoires.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Identité ── */}
          <section className="space-y-4">
            <h2 className="text-headline-sm text-on-surface border-b border-outline-variant pb-2">
              Identité
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Nom" required>
                <input
                  className={inputCls}
                  value={form.nom}
                  onChange={(e) => setField("nom", e.target.value)}
                  placeholder="Kabila"
                  required
                />
              </Field>
              <Field label="Post-nom" required>
                <input
                  className={inputCls}
                  value={form.postnom}
                  onChange={(e) => setField("postnom", e.target.value)}
                  placeholder="Mwamba"
                  required
                />
              </Field>
              <Field label="Prénom" required>
                <input
                  className={inputCls}
                  value={form.prenom}
                  onChange={(e) => setField("prenom", e.target.value)}
                  placeholder="Jean"
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Sexe" required>
                <select
                  className={inputCls}
                  value={form.sexe}
                  onChange={(e) => setField("sexe", e.target.value)}
                  required
                >
                  <option value="">Sélectionner…</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="A">Autre</option>
                </select>
              </Field>
              <Field label="Date de naissance" required>
                <input
                  type="date"
                  className={inputCls}
                  value={form.date_naissance}
                  onChange={(e) => setField("date_naissance", e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Ville de naissance" required>
                <input
                  className={inputCls}
                  value={form.lieu_naissance_ville}
                  onChange={(e) => setField("lieu_naissance_ville", e.target.value)}
                  placeholder="Kinshasa"
                  required
                />
              </Field>
              <Field label="Province de naissance">
                <input
                  className={inputCls}
                  value={form.lieu_naissance_province}
                  onChange={(e) => setField("lieu_naissance_province", e.target.value)}
                  placeholder="Kinshasa"
                />
              </Field>
              <Field label="Pays de naissance" required>
                <input
                  className={inputCls}
                  value={form.lieu_naissance_pays}
                  onChange={(e) => setField("lieu_naissance_pays", e.target.value)}
                  placeholder="RDC"
                  required
                />
              </Field>
            </div>
          </section>

          {/* ── Adresse ── */}
          <section className="space-y-4">
            <h2 className="text-headline-sm text-on-surface border-b border-outline-variant pb-2">
              Adresse
            </h2>
            <Field label="Adresse (ligne 1)">
              <input
                className={inputCls}
                value={form.adresse_ligne1}
                onChange={(e) => setField("adresse_ligne1", e.target.value)}
                placeholder="123, Avenue de la Paix"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Quartier / Commune">
                <input
                  className={inputCls}
                  value={form.adresse_quartier}
                  onChange={(e) => setField("adresse_quartier", e.target.value)}
                  placeholder="Gombe"
                />
              </Field>
              <Field label="Ville">
                <input
                  className={inputCls}
                  value={form.adresse_ville}
                  onChange={(e) => setField("adresse_ville", e.target.value)}
                  placeholder="Kinshasa"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Province">
                <input
                  className={inputCls}
                  value={form.adresse_province}
                  onChange={(e) => setField("adresse_province", e.target.value)}
                  placeholder="Kinshasa"
                />
              </Field>
              <Field label="Pays">
                <input
                  className={inputCls}
                  value={form.adresse_pays}
                  onChange={(e) => setField("adresse_pays", e.target.value)}
                  placeholder="RDC"
                />
              </Field>
            </div>
          </section>

          {/* ── Contacts ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
              <h2 className="text-headline-sm text-on-surface">Contacts</h2>
              <button
                type="button"
                onClick={addContact}
                className="inline-flex items-center gap-1 text-label-md text-primary hover:text-primary-container transition-colors"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter un contact
              </button>
            </div>

            {contacts.length === 0 && (
              <p className="text-body-sm text-on-surface-variant italic">
                Aucun contact ajouté.
              </p>
            )}

            {contacts.map((contact, index) => (
              <div
                key={index}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-label-md font-medium text-on-surface-variant">
                    Contact {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                  >
                    <DeleteOutlined style={{ fontSize: 18 }} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Nom complet" required>
                    <input
                      className={inputCls}
                      value={contact.full_name}
                      onChange={(e) => setContactField(index, "full_name", e.target.value)}
                      placeholder="Mwamba Kabila"
                      required
                    />
                  </Field>
                  <Field label="Lien avec le patient" required>
                    <select
                      className={inputCls}
                      value={contact.relation}
                      onChange={(e) => setContactField(index, "relation", e.target.value)}
                      required
                    >
                      <option value="">Sélectionner…</option>
                      {RELATIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Téléphone">
                    <input
                      className={inputCls}
                      value={contact.phone ?? ""}
                      onChange={(e) => setContactField(index, "phone", e.target.value)}
                      placeholder="+243 8xx xxx xxx"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className={inputCls}
                      value={contact.email ?? ""}
                      onChange={(e) => setContactField(index, "email", e.target.value)}
                      placeholder="contact@exemple.com"
                    />
                  </Field>
                </div>

                <Field label="Adresse">
                  <input
                    className={inputCls}
                    value={contact.adresse ?? ""}
                    onChange={(e) => setContactField(index, "adresse", e.target.value)}
                    placeholder="Adresse du contact"
                  />
                </Field>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contact.is_emergency}
                      onChange={(e) =>
                        setContactField(index, "is_emergency", e.target.checked)
                      }
                      className="accent-primary"
                    />
                    Contact d&apos;urgence
                  </label>
                  <label className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contact.is_primary}
                      onChange={(e) =>
                        setContactField(index, "is_primary", e.target.checked)
                      }
                      className="accent-primary"
                    />
                    Contact principal
                  </label>
                </div>
              </div>
            ))}
          </section>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer le patient"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
