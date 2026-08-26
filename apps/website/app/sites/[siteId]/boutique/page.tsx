"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AddOutlined,
  ArrowBackOutlined,
  DeleteOutlineOutlined,
  Inventory2Outlined,
  SellOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import { FicheProduit } from "@/components/boutique/FicheProduit";
import {
  ETATS_PRODUIT,
  api,
  montant,
  type CategorieProduit,
  type EtatProduit,
  type Produit,
} from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const TEINTE: Record<EtatProduit, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  EN_VENTE: "bg-secondary/15 text-secondary",
  EPUISE: "bg-primary/10 text-primary",
  RETIRE: "bg-error-container/40 text-error",
};

/** Le catalogue de la boutique.
 *
 *  La liste à gauche, la fiche à droite : un produit se règle en regardant les
 *  autres. Une page par produit obligerait à faire l'aller-retour pour comparer
 *  deux prix — ce qu'on fait tout le temps en tenant un catalogue.
 */
export default function BoutiquePage() {
  const params = useParams<{ siteId: string }>();
  const siteId = Number(params.siteId);
  const { can } = usePermissions();
  const peutGerer = can("website.boutique.manage");

  const [produits, setProduits] = useState<Produit[] | null>(null);
  const [categories, setCategories] = useState<CategorieProduit[]>([]);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [filtre, setFiltre] = useState("");
  const [rayon, setRayon] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Produit | null>(null);
  const [nouveauRayon, setNouveauRayon] = useState("");

  const charger = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api.produits(siteId), api.categories(siteId)]);
      setProduits(p);
      setCategories(c);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setProduits([]);
    }
  }, [siteId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const visibles = useMemo(() => {
    const terme = filtre.trim().toLowerCase();
    return (produits ?? [])
      .filter((p) => (rayon === null ? true : p.categorie_id === rayon))
      .filter((p) => !terme || p.nom.toLowerCase().includes(terme));
  }, [produits, filtre, rayon]);

  const produit = (produits ?? []).find((p) => p.id === choisi) ?? null;

  async function agir(action: () => Promise<unknown>, message?: string) {
    setBusy(true);
    setErreur(null);
    try {
      await action();
      if (message) setToast(message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1200px] p-4 md:p-8">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Retour au site
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">Boutique</h1>
            <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
              Le catalogue de ce site. Un produit n&apos;apparaît en vitrine qu&apos;une fois
              « en vente » — et le site publié.
            </p>
          </div>
          <button
            type="button"
            disabled={!peutGerer || busy}
            onClick={() =>
              void agir(async () => {
                const cree = await api.creerProduit(siteId, { nom: "Nouveau produit" });
                setChoisi(cree.id);
              })
            }
            title={peutGerer ? undefined : "Vous n'avez pas le droit de tenir le catalogue."}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Nouveau produit
          </button>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[22rem_1fr]">
          {/* ── Les rayons et la liste ── */}
          <div className="space-y-3">
            <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-3">
              <p className="mb-2 text-label-md font-medium text-on-surface">Rayons</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRayon(null)}
                  className={`h-7 rounded-lg px-2.5 text-label-md transition-colors ${
                    rayon === null
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Tous ({(produits ?? []).length})
                </button>
                {categories.map((c) => (
                  <span key={c.id} className="group relative inline-flex">
                    <button
                      type="button"
                      onClick={() => setRayon(c.id)}
                      className={`h-7 rounded-lg px-2.5 text-label-md transition-colors ${
                        rayon === c.id
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {c.nom} ({c.produits})
                    </button>
                    {peutGerer && (
                      <button
                        type="button"
                        aria-label={`Supprimer le rayon ${c.nom}`}
                        title="Le rayon disparaît, ses produits restent."
                        onClick={() =>
                          void agir(() => api.supprimerCategorie(c.id), "Rayon supprimé.")
                        }
                        className="ml-0.5 hidden text-outline hover:text-error group-hover:inline"
                      >
                        <DeleteOutlineOutlined style={{ fontSize: 14 }} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {peutGerer && (
                <div className="mt-2 flex gap-1.5">
                  <input
                    className={`${CHAMP} h-8`}
                    placeholder="Nouveau rayon"
                    value={nouveauRayon}
                    onChange={(e) => setNouveauRayon(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" || !nouveauRayon.trim()) return;
                      void agir(async () => {
                        await api.creerCategorie(siteId, { nom: nouveauRayon.trim() });
                        setNouveauRayon("");
                      });
                    }}
                  />
                </div>
              )}
            </section>

            <input
              className={CHAMP}
              placeholder="Chercher un produit…"
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
            />

            {produits === null ? (
              <p className="text-body-sm text-on-surface-variant">Chargement…</p>
            ) : visibles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-soft p-6 text-center">
                <Inventory2Outlined style={{ fontSize: 32 }} className="text-outline" />
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  {(produits ?? []).length === 0
                    ? "Aucun produit. Créez le premier."
                    : "Aucun produit ne correspond."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
                {visibles.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setChoisi(p.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                        choisi === p.id ? "bg-primary/5" : "hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-on-surface">
                          {p.nom}
                        </span>
                        <span className="block truncate text-label-md text-outline">
                          {p.prix_min_centimes === p.prix_max_centimes
                            ? montant(p.prix_min_centimes, p.devise)
                            : `dès ${montant(p.prix_min_centimes, p.devise)}`}
                          {p.categorie_nom ? ` · ${p.categorie_nom}` : ""}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm ${TEINTE[p.etat]}`}
                      >
                        {p.etat === "EN_VENTE" ? "en vente" : ETATS_PRODUIT[p.etat].split(" —")[0]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── La fiche ── */}
          {produit ? (
            <FicheProduit
              key={produit.id}
              produit={produit}
              categories={categories}
              peutGerer={peutGerer}
              onEnregistre={(message) => setToast(message)}
              onRecharger={charger}
              onSupprimer={() => setASupprimer(produit)}
            />
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-outline-soft p-10 text-center">
              <p className="max-w-[40ch] text-body-sm text-on-surface-variant">
                <SellOutlined style={{ fontSize: 28 }} className="mb-2 block text-outline" />
                Choisissez un produit pour régler son prix, ses déclinaisons et sa fiche.
              </p>
            </div>
          )}
        </div>
      </div>

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.nom} » ?`}
          message="Le produit et ses déclinaisons disparaissent. Les commandes déjà passées gardent leur copie du prix et du libellé."
          confirmLabel="Supprimer"
          busy={busy}
          onCancel={() => setASupprimer(null)}
          onConfirm={() => {
            const cible = aSupprimer;
            setASupprimer(null);
            setChoisi(null);
            void agir(() => api.supprimerProduit(cible.id), "Produit supprimé.");
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}
