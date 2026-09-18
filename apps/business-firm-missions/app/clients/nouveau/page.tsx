"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { createTiers, type TypeTiers, type CategorieTiers } from "@/lib/tiers-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1";

export default function NouveauClientPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<CategorieTiers>("ENTREPRISE");
  const [type, setType] = useState<TypeTiers>("CLIENT");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [secteurActivite, setSecteurActivite] = useState("");
  const [numeroContribuable, setNumeroContribuable] = useState("");
  const [adresseVille, setAdresseVille] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const client = await createTiers({
        nom: nom.trim(),
        categorie,
        type,
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        secteur_activite: secteurActivite.trim() || undefined,
        numero_contribuable: numeroContribuable.trim() || undefined,
        adresse_ville: adresseVille.trim() || undefined,
      });
      router.push(`/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[700px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Nouveau client</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Les autres informations (contacts, contrats, services souscrits…) se complètent depuis la fiche.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-6 space-y-4">
          {error && <p className="text-body-sm text-error">{error}</p>}
          <div>
            <span className={LABEL}>Nom *</span>
            <input className={`${FIELD} w-full`} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>Catégorie</span>
              <select className={`${FIELD} w-full`} value={categorie} onChange={(e) => setCategorie(e.target.value as CategorieTiers)}>
                <option value="ENTREPRISE">Entreprise</option>
                <option value="PARTICULIER">Particulier</option>
              </select>
            </div>
            <div>
              <span className={LABEL}>Type</span>
              <select className={`${FIELD} w-full`} value={type} onChange={(e) => setType(e.target.value as TypeTiers)}>
                <option value="CLIENT">Client</option>
                <option value="FOURNISSEUR">Fournisseur</option>
                <option value="LES_DEUX">Client &amp; fournisseur</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>E-mail</span>
              <input className={`${FIELD} w-full`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <span className={LABEL}>Téléphone</span>
              <input className={`${FIELD} w-full`} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>Secteur d&rsquo;activité</span>
              <input className={`${FIELD} w-full`} value={secteurActivite} onChange={(e) => setSecteurActivite(e.target.value)} placeholder="Commerce, BTP, santé…" />
            </div>
            <div>
              <span className={LABEL}>Ville</span>
              <input className={`${FIELD} w-full`} value={adresseVille} onChange={(e) => setAdresseVille(e.target.value)} />
            </div>
          </div>
          <div>
            <span className={LABEL}>Numéro d&rsquo;identification (contribuable)</span>
            <input className={`${FIELD} w-full`} value={numeroContribuable} onChange={(e) => setNumeroContribuable(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => router.push("/clients")} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
