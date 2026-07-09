"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { createClient, type ClientDetail } from "@/lib/ventes-api";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export function CreateClientDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: ClientDetail) => void;
}) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [ville, setVille] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const client = await createClient({
        nom: nom.trim(),
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        adresse_ville: ville.trim() || undefined,
      });
      onCreated(client);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Nouveau client" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-body-sm text-on-surface-variant">
          Crée un client de base dans le service Tiers.
        </p>
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
            {submitting ? "Création…" : "Créer le client"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
