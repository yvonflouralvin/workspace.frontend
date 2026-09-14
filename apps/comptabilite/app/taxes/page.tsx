"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { listTaxes, chargerTaxeDefaut, listComptes, createTaxe, type Taxe, type Compte } from "@/lib/compta-api";
import { AddOutlined, DownloadOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function TaxesPage() {
  const { can } = usePermissions();
  const canManage = can("comptabilite.parametrage.manage");

  const [taxes, setTaxes] = useState<Taxe[] | null>(null);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [ajout, setAjout] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [nom, setNom] = useState("");
  const [taux, setTaux] = useState("18");
  const [compteCollecte, setCompteCollecte] = useState("");
  const [compteDeductible, setCompteDeductible] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    listTaxes().then(setTaxes);
  }

  useEffect(() => {
    reload();
    listComptes().then(setComptes);
  }, []);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createTaxe({
        nom: nom.trim(),
        taux: Number(taux),
        compte_collecte_id: compteCollecte ? Number(compteCollecte) : undefined,
        compte_deductible_id: compteDeductible ? Number(compteDeductible) : undefined,
      });
      setNom("");
      setAjout(false);
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function defaut() {
    setChargement(true);
    try {
      await chargerTaxeDefaut();
      reload();
    } finally {
      setChargement(false);
    }
  }

  function nomCompte(id: number | null): string {
    if (!id) return "—";
    const c = comptes.find((x) => x.id === id);
    return c ? `${c.numero} — ${c.libelle}` : `#${id}`;
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Taxes</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Utilisées pour ventiler HT / TVA lors de la comptabilisation d&rsquo;une facture.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={defaut} disabled={chargement} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50">
                <DownloadOutlined style={{ fontSize: 16 }} />
                TVA 18% par défaut
              </button>
              {!ajout && (
                <button type="button" onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors">
                  <AddOutlined style={{ fontSize: 16 }} />
                  Nouvelle taxe
                </button>
              )}
            </div>
          )}
        </div>

        {ajout && (
          <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <div className="flex-1 min-w-[160px]">
              <span className="block text-label-sm uppercase text-outline mb-1">Nom</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className={`${FIELD} w-full`} required autoFocus />
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Taux (%)</span>
              <input type="number" step="0.01" value={taux} onChange={(e) => setTaux(e.target.value)} className={`${FIELD} w-20`} required />
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Compte collecte</span>
              <select value={compteCollecte} onChange={(e) => setCompteCollecte(e.target.value)} className={FIELD}>
                <option value="">—</option>
                {comptes.map((c) => <option key={c.id} value={c.id}>{c.numero} — {c.libelle}</option>)}
              </select>
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Compte déductible</span>
              <select value={compteDeductible} onChange={(e) => setCompteDeductible(e.target.value)} className={FIELD}>
                <option value="">—</option>
                {comptes.map((c) => <option key={c.id} value={c.id}>{c.numero} — {c.libelle}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setAjout(false)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "…" : "Créer"}
            </button>
          </form>
        )}

        {taxes === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : taxes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <p className="text-body-md text-on-surface-variant">Aucune taxe configurée.</p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            {taxes.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <p className="text-body-md font-medium text-on-surface">{t.nom} — {t.taux}%</p>
                <p className="text-label-md text-outline">
                  Collecte : {nomCompte(t.compte_collecte_id)} · Déductible : {nomCompte(t.compte_deductible_id)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  );
}
