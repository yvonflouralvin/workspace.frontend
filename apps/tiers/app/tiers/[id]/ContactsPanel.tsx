"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  type Contact,
} from "@/lib/tiers-api";
import { AddOutlined, EditOutlined, DeleteOutlined, PersonOutlined } from "@mui/icons-material";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

interface ContactFormState {
  nom: string;
  fonction: string;
}

const EMPTY_FORM: ContactFormState = { nom: "", fonction: "" };

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
  const [formOpenFor, setFormOpenFor] = useState<number | "new" | null>(null);
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
    setFormOpenFor("new");
  }

  function openEdit(c: Contact) {
    setForm({ nom: c.nom, fonction: c.fonction ?? "" });
    setFormError(null);
    setFormOpenFor(c.id);
  }

  function closeForm() {
    setFormOpenFor(null);
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
      const payload = { nom: form.nom.trim(), fonction: form.fonction.trim() || undefined };
      if (formOpenFor === "new") {
        const created = await createContact(tiersId, payload);
        setContacts((cs) => [...(cs ?? []), created].sort((a, b) => a.nom.localeCompare(b.nom)));
        onToast("Contact ajouté.");
      } else if (typeof formOpenFor === "number") {
        const updated = await updateContact(tiersId, formOpenFor, payload);
        setContacts((cs) =>
          (cs ?? [])
            .map((c) => (c.id === updated.id ? updated : c))
            .sort((a, b) => a.nom.localeCompare(b.nom)),
        );
        onToast("Contact modifié.");
      }
      closeForm();
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
        {canEdit && formOpenFor === null && (
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

      {formOpenFor === "new" && (
        <ContactForm
          form={form}
          setForm={setForm}
          saving={saving}
          error={formError}
          onCancel={closeForm}
          onSubmit={save}
        />
      )}

      {contacts.length === 0 && formOpenFor === null && (
        <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
          <p className="text-body-md text-on-surface-variant">Aucun contact enregistré pour ce client.</p>
        </div>
      )}

      {contacts.length > 0 && (
        <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
          {contacts.map((c) =>
            formOpenFor === c.id ? (
              <li key={c.id} className="p-4">
                <ContactForm
                  form={form}
                  setForm={setForm}
                  saving={saving}
                  error={formError}
                  onCancel={closeForm}
                  onSubmit={save}
                />
              </li>
            ) : (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-outline">
                  <PersonOutlined style={{ fontSize: 18 }} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-medium text-on-surface truncate">{c.nom}</p>
                  {c.fonction && (
                    <p className="text-label-md text-outline truncate">{c.fonction}</p>
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
            ),
          )}
        </ul>
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

function ContactForm({
  form,
  setForm,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  form: ContactFormState;
  setForm: (f: ContactFormState) => void;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
    >
      {error && <p className="text-body-sm text-error">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
