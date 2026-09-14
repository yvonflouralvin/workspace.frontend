"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  type Contact,
} from "@/lib/tiers-api";
import {
  AddOutlined,
  EditOutlined,
  DeleteOutlined,
  PersonOutlined,
  PhoneOutlined,
  EmailOutlined,
  PlaceOutlined,
} from "@mui/icons-material";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

interface ContactFormState {
  nom: string;
  fonction: string;
  telephone: string;
  email: string;
  adresse_bureau: string;
}

const EMPTY_FORM: ContactFormState = {
  nom: "",
  fonction: "",
  telephone: "",
  email: "",
  adresse_bureau: "",
};

function toForm(c: Contact): ContactFormState {
  return {
    nom: c.nom,
    fonction: c.fonction ?? "",
    telephone: c.telephone ?? "",
    email: c.email ?? "",
    adresse_bureau: c.adresse_bureau ?? "",
  };
}

export function ContactsPanel({
  tiersId,
  canEdit,
  onToast,
}: {
  tiersId: number;
  canEdit: boolean;
  onToast: (message: string) => void;
}) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerFor, setDrawerFor] = useState<Contact | "new" | null>(null);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listContacts(tiersId)
      .then(setContacts)
      .catch(() => setError("Impossible de charger les contacts."));
  }, [tiersId]);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDrawerFor("new");
  }

  function openEdit(c: Contact) {
    setForm(toForm(c));
    setFormError(null);
    setDrawerFor(c);
  }

  function closeDrawer() {
    setDrawerFor(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) {
      setFormError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nom: form.nom.trim(),
        fonction: form.fonction.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        email: form.email.trim() || undefined,
        adresse_bureau: form.adresse_bureau.trim() || undefined,
      };
      if (drawerFor === "new") {
        const created = await createContact(tiersId, payload);
        setContacts((cs) => [...(cs ?? []), created].sort((a, b) => a.nom.localeCompare(b.nom)));
        onToast("Contact ajouté.");
      } else if (drawerFor) {
        const updated = await updateContact(tiersId, drawerFor.id, payload);
        setContacts((cs) =>
          (cs ?? [])
            .map((c) => (c.id === updated.id ? updated : c))
            .sort((a, b) => a.nom.localeCompare(b.nom)),
        );
        onToast("Contact modifié.");
      }
      closeDrawer();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteContact(tiersId, toDelete.id);
      setContacts((cs) => (cs ?? []).filter((c) => c.id !== toDelete.id));
      onToast("Contact supprimé.");
    } catch {
      onToast("Impossible de supprimer ce contact.");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  if (error) {
    return <p className="text-body-sm text-error">{error}</p>;
  }

  if (contacts === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-label-md text-outline">
          {contacts.length} contact{contacts.length > 1 ? "s" : ""}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter un contact
          </button>
        )}
      </div>

      {contacts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
          <p className="text-body-md text-on-surface-variant">Aucun contact enregistré pour ce client.</p>
        </div>
      )}

      {contacts.length > 0 && (
        <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-outline mt-0.5">
                <PersonOutlined style={{ fontSize: 18 }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-md font-medium text-on-surface truncate">{c.nom}</p>
                {c.fonction && <p className="text-label-md text-outline truncate">{c.fonction}</p>}
                {(c.telephone || c.email || c.adresse_bureau) && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {c.telephone && (
                      <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                        <PhoneOutlined style={{ fontSize: 14 }} />
                        {c.telephone}
                      </span>
                    )}
                    {c.email && (
                      <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant truncate">
                        <EmailOutlined style={{ fontSize: 14 }} />
                        {c.email}
                      </span>
                    )}
                    {c.adresse_bureau && (
                      <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant truncate">
                        <PlaceOutlined style={{ fontSize: 14 }} />
                        {c.adresse_bureau}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    aria-label="Modifier"
                  >
                    <EditOutlined style={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-error hover:bg-error-container transition-colors"
                    aria-label="Supprimer"
                  >
                    <DeleteOutlined style={{ fontSize: 16 }} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {drawerFor !== null && (
        <RightDrawer
          title={drawerFor === "new" ? "Ajouter un contact" : "Modifier le contact"}
          onClose={closeDrawer}
          width="md:w-[440px] md:max-w-[92vw]"
          footer={
            <div className="flex flex-1 items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeDrawer}
                className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="contact-form"
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          }
        >
          <form id="contact-form" onSubmit={save} className="space-y-4">
            {formError && <p className="text-body-sm text-error">{formError}</p>}
            <div>
              <span className={LABEL}>Nom</span>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className={FIELD}
                autoFocus
                required
              />
            </div>
            <div>
              <span className={LABEL}>Rôle dans l&rsquo;entreprise</span>
              <input
                type="text"
                value={form.fonction}
                onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                className={FIELD}
                placeholder="Ex. Directeur des achats"
              />
            </div>
            <div>
              <span className={LABEL}>Téléphone</span>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <span className={LABEL}>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <span className={LABEL}>Adresse du bureau (facultatif)</span>
              <input
                type="text"
                value={form.adresse_bureau}
                onChange={(e) => setForm({ ...form, adresse_bureau: e.target.value })}
                className={FIELD}
              />
            </div>
          </form>
        </RightDrawer>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Supprimer « ${toDelete.nom} » ?`}
          message="Ce contact sera retiré définitivement de la fiche client."
          confirmLabel="Supprimer"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
