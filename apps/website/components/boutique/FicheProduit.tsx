"use client";

import { useEffect, useState } from "react";
import { AddOutlined, DeleteOutlineOutlined, ImageOutlined } from "@mui/icons-material";

import { Bibliotheque } from "@/components/builder/Bibliotheque";
import {
  ETATS_PRODUIT,
  api,
  montant,
  urlMediaEditeur,
  type CategorieProduit,
  type EtatProduit,
  type Media,
  type Produit,
  type Variante,
} from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** La fiche d'un produit : identité, images, déclinaisons.
 *
 *  **Les prix se saisissent en unités, se stockent en centimes.** La conversion
 *  vit ici, à un seul endroit, au bord de l'écran — le reste de la chaîne ne
 *  connaît que des entiers, et aucun total n'est jamais faux d'un centime.
 *
 *  **Les déclinaisons se remplacent en bloc.** Fusionner demanderait
 *  d'identifier chaque ligne d'un appel à l'autre et de décider quoi faire
 *  d'une variante disparue déjà présente dans un panier. Le prix étant figé
 *  dans la commande, ce remplacement n'a aucune conséquence sur le passé.
 */
export function FicheProduit({
  produit,
  categories,
  peutGerer,
  onEnregistre,
  onRecharger,
  onSupprimer,
}: {
  produit: Produit;
  categories: CategorieProduit[];
  peutGerer: boolean;
  onEnregistre: (message: string) => void;
  onRecharger: () => Promise<void> | void;
  onSupprimer: () => void;
}) {
  const [nom, setNom] = useState(produit.nom);
  const [resume, setResume] = useState(produit.resume ?? "");
  const [etat, setEtat] = useState<EtatProduit>(produit.etat);
  const [categorie, setCategorie] = useState<number | null>(produit.categorie_id);
  const [images, setImages] = useState<string[]>(produit.images ?? []);
  const [variantes, setVariantes] = useState<Variante[]>(produit.variantes);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [biblio, setBiblio] = useState(false);

  useEffect(() => {
    setNom(produit.nom);
    setResume(produit.resume ?? "");
    setEtat(produit.etat);
    setCategorie(produit.categorie_id);
    setImages(produit.images ?? []);
    setVariantes(produit.variantes);
  }, [produit]);

  async function enregistrer() {
    setBusy(true);
    setErreur(null);
    try {
      await api.modifierProduit(produit.id, {
        nom: nom.trim() || produit.nom,
        resume: resume.trim() || null,
        etat,
        categorie_id: categorie,
        images,
      });
      await api.poserVariantes(
        produit.id,
        variantes.map((v, i) => ({ ...v, position: i })),
      );
      await onRecharger();
      onEnregistre("Produit enregistré.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  function poserVariante(index: number, patch: Partial<Variante>) {
    setVariantes((v) => v.map((ligne, i) => (i === index ? { ...ligne, ...patch } : ligne)));
  }

  return (
    <section className="space-y-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-label-md text-on-surface-variant">Nom</span>
          <input
            className={CHAMP}
            value={nom}
            disabled={!peutGerer}
            onChange={(e) => setNom(e.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-label-md text-on-surface-variant">
            Résumé — la phrase de la vignette
          </span>
          <input
            className={CHAMP}
            value={resume}
            disabled={!peutGerer}
            onChange={(e) => setResume(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-label-md text-on-surface-variant">État</span>
          <select
            className={CHAMP}
            value={etat}
            disabled={!peutGerer}
            onChange={(e) => setEtat(e.target.value as EtatProduit)}
          >
            {Object.entries(ETATS_PRODUIT).map(([cle, libelle]) => (
              <option key={cle} value={cle}>
                {libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-label-md text-on-surface-variant">Rayon</span>
          <select
            className={CHAMP}
            value={categorie ?? ""}
            disabled={!peutGerer}
            onChange={(e) => setCategorie(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Sans rayon</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── Images ── */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-label-md font-medium text-on-surface">Images</span>
          {peutGerer && (
            <button
              type="button"
              onClick={() => setBiblio(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              <ImageOutlined style={{ fontSize: 16 }} />
              Ajouter
            </button>
          )}
        </div>
        {images.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline-soft px-3 py-4 text-center text-label-md text-outline">
            Aucune image. La première sert de vignette en vitrine.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {images.map((jeton, i) => (
              <li key={jeton} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlMediaEditeur(jeton)}
                  alt=""
                  className="h-20 w-20 rounded-lg border border-outline-soft object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1 text-label-sm text-on-primary">
                    vignette
                  </span>
                )}
                {peutGerer && (
                  <button
                    type="button"
                    aria-label="Retirer cette image"
                    onClick={() => setImages((l) => l.filter((j) => j !== jeton))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-surface-container-lowest p-0.5 text-outline shadow-sm hover:text-error"
                  >
                    <DeleteOutlineOutlined style={{ fontSize: 15 }} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Déclinaisons ── */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-label-md font-medium text-on-surface">Déclinaisons</span>
          {peutGerer && (
            <button
              type="button"
              onClick={() =>
                setVariantes((v) => [
                  ...v,
                  {
                    libelle: "",
                    sku: null,
                    prix_centimes: 0,
                    prix_barre_centimes: null,
                    devise: v[0]?.devise ?? "USD",
                    stock: null,
                    poids_grammes: null,
                    position: v.length,
                    actif: true,
                  },
                ])
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter
            </button>
          )}
        </div>
        <p className="mb-2 max-w-[70ch] text-label-sm text-outline">
          Le prix vit sur la déclinaison. Un produit sans option en a une quand même — c&apos;est
          elle qu&apos;on met au panier. Un stock laissé vide veut dire « non suivi », ce qui
          n&apos;est pas la même chose que zéro.
        </p>

        <div className="space-y-2">
          {variantes.map((v, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-outline-soft p-2 sm:grid-cols-[1fr_7rem_7rem_6rem_auto]"
            >
              <input
                className={CHAMP}
                placeholder="Libellé (ex. Taille M)"
                value={v.libelle ?? ""}
                disabled={!peutGerer}
                onChange={(e) => poserVariante(i, { libelle: e.target.value })}
              />
              <input
                className={CHAMP}
                type="number"
                step="0.01"
                min={0}
                placeholder="Prix"
                value={v.prix_centimes ? (v.prix_centimes / 100).toString() : ""}
                disabled={!peutGerer}
                onChange={(e) =>
                  poserVariante(i, {
                    prix_centimes: Math.round(Number(e.target.value || 0) * 100),
                  })
                }
              />
              <input
                className={CHAMP}
                type="number"
                step="0.01"
                min={0}
                placeholder="Prix barré"
                value={
                  v.prix_barre_centimes ? (v.prix_barre_centimes / 100).toString() : ""
                }
                disabled={!peutGerer}
                onChange={(e) =>
                  poserVariante(i, {
                    prix_barre_centimes: e.target.value
                      ? Math.round(Number(e.target.value) * 100)
                      : null,
                  })
                }
              />
              <input
                className={CHAMP}
                type="number"
                min={0}
                placeholder="Stock"
                value={v.stock ?? ""}
                disabled={!peutGerer}
                onChange={(e) =>
                  poserVariante(i, { stock: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
              {peutGerer && variantes.length > 1 && (
                <button
                  type="button"
                  aria-label="Retirer cette déclinaison"
                  onClick={() => setVariantes((l) => l.filter((_, n) => n !== i))}
                  className="self-center text-outline transition-colors hover:text-error"
                >
                  <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {erreur && (
        <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-soft pt-3">
        <span className="text-label-md text-outline">
          Adresse publique : <code className="text-on-surface-variant">/boutique/{produit.slug}</code>
          {" · "}
          {produit.disponible ? "achetable" : "pas achetable en l'état"}
          {produit.prix_min_centimes !== null &&
            ` · ${montant(produit.prix_min_centimes, produit.devise)}`}
        </span>
        <span className="flex gap-2">
          {peutGerer && (
            <button
              type="button"
              onClick={onSupprimer}
              className="inline-flex h-9 items-center rounded-lg border border-error px-3 text-label-lg text-error transition-colors hover:bg-error-container/30"
            >
              Supprimer
            </button>
          )}
          <button
            type="button"
            disabled={!peutGerer || busy}
            onClick={() => void enregistrer()}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </span>
      </div>

      {biblio && (
        <Bibliotheque
          siteId={produit.site_id}
          onChoisir={(media: Media) => {
            setImages((l) => (l.includes(media.jeton) ? l : [...l, media.jeton]));
            setBiblio(false);
          }}
          onFermer={() => setBiblio(false)}
        />
      )}
    </section>
  );
}
