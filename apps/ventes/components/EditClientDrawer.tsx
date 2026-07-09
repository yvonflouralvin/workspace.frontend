"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { updateClient, type Client } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export function EditClientDrawer({
  client,
  onClose,
  onSaved,
}: {
  client: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
}) {
  const [nom, setNom] = useState(client.nom);
  const [email, setEmail] = useState(client.email ?? "");
  const [telephone, setTelephone] = useState(client.telephone ?? "");
  const [ville, setVille] = useState(client.adresse_ville ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateClient(client.id, {
        nom: nom.trim(),
        email: email.trim() || null,
        telephone: telephone.trim() || null,
        adresse_ville: ville.trim() || null,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Modifier le client" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
        <div>
          <label className={labelCls}>Nom *</label>
          <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} autoFocus required />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Téléphone</label>
          <input className={inputCls} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Ville</label>
          <input className={inputCls} value={ville} onChange={(e) => setVille(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || !nom.trim()}
            className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
