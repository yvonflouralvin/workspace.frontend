"use client";

import { useMemo, useState } from "react";
import { AddOutlined } from "@mui/icons-material";
import { Modal } from "@repo/ui/Modal";
import { SearchField } from "@repo/ui/SearchField";

import { DISPOSITIONS, creerSectionDisposition } from "@repo/site-widgets/catalogue";
import { CATEGORIES_MODELES, MODELES } from "@repo/site-widgets/modeles";
import type { Noeud } from "@repo/site-widgets/types";
import { ApercuModeleVisuel } from "./ApercuModeleVisuel";

/** Choisir une section : vide, ou toute faite.
 *
 *  **Une seule porte, deux onglets.** La palette proposait les modèles à
 *  gauche et le canevas les dispositions en bas : deux endroits pour un seul
 *  geste, et il fallait déjà savoir lequel regarder. Ici on demande « une
 *  section », et c'est la fenêtre qui présente les deux réponses.
 *
 *  Un modèle n'est PAS un composant : une fois posé, il n'existe plus — il ne
 *  reste que des sections et des widgets ordinaires. Un modèle qui resterait
 *  vivant obligerait à décider ce qui arrive quand on en modifie un morceau,
 *  et à écrire un moteur de surcharge que personne n'a demandé.
 *
 *  Le catalogue de modèles s'inspire volontairement des bibliothèques façon
 *  Elementor : catégories en colonne (pas des puces qu'il faut faire défiler),
 *  vraies vignettes (`ApercuModeleVisuel`, pas des barres grises abstraites),
 *  et un survol qui invite au clic — plutôt qu'une simple liste de boutons.
 */
export function ChoixSection({
  onChoisir,
  onFermer,
}: {
  onChoisir: (section: Noeud) => void;
  onFermer: () => void;
}) {
  const [onglet, setOnglet] = useState<"vide" | "modeles">("vide");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  const compteParCategorie = useMemo(() => {
    const compte = new Map<string, number>();
    for (const m of MODELES) compte.set(m.categorie, (compte.get(m.categorie) ?? 0) + 1);
    return compte;
  }, []);

  const modeles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return MODELES.filter((m) => {
      if (categorie && m.categorie !== categorie) return false;
      if (!q) return true;
      return m.libelle.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    });
  }, [categorie, recherche]);

  return (
    <Modal title="Ajouter une section" onClose={onFermer} width="max-w-[68rem]">
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {[
            { cle: "vide", libelle: "Section vide" },
            { cle: "modeles", libelle: `Sections toutes faites (${MODELES.length})` },
          ].map((o) => (
            <button
              key={o.cle}
              type="button"
              onClick={() => setOnglet(o.cle as "vide" | "modeles")}
              className={`h-8 rounded-lg px-3 text-label-lg transition-colors ${
                onglet === o.cle
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {o.libelle}
            </button>
          ))}
        </div>

        {onglet === "vide" ? (
          <>
            <p className="text-body-sm text-on-surface-variant">
              Choisissez le découpage en colonnes. Chaque colonne arrive vide, avec un bouton
              pour y poser un premier bloc.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DISPOSITIONS.map((disposition) => (
                <button
                  key={disposition.cle}
                  type="button"
                  onClick={() => onChoisir(creerSectionDisposition(disposition.cle))}
                  className="rounded-xl border border-outline-soft p-3 transition-colors hover:border-primary"
                >
                  <span className="flex h-8 items-center justify-center gap-1">
                    {disposition.parts.map((part, i) => (
                      <span
                        key={i}
                        style={{ flexGrow: part }}
                        className="h-7 rounded bg-outline-variant"
                      />
                    ))}
                  </span>
                  <span className="mt-2 block text-label-md text-on-surface-variant">
                    {disposition.libelle}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex gap-4">
            {/* Catégories en colonne : à plus de dix entrées, des puces qu'on
                fait défiler horizontalement redeviennent le problème qu'elles
                étaient censées résoudre. */}
            <nav className="w-44 flex-none space-y-0.5 border-r border-outline-soft pr-3">
              <button
                type="button"
                onClick={() => setCategorie(null)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-label-lg transition-colors ${
                  categorie === null
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                Toutes
                <span className="text-label-sm text-outline">{MODELES.length}</span>
              </button>
              {CATEGORIES_MODELES.map((c) => (
                <button
                  key={c.cle}
                  type="button"
                  onClick={() => setCategorie(c.cle)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-label-lg transition-colors ${
                    categorie === c.cle
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span className="truncate">{c.libelle}</span>
                  <span className="flex-none text-label-sm text-outline">
                    {compteParCategorie.get(c.cle) ?? 0}
                  </span>
                </button>
              ))}
            </nav>

            <div className="min-w-0 flex-1 space-y-3">
              <SearchField
                value={recherche}
                onChange={setRecherche}
                placeholder="Rechercher un modèle…"
                autoFocus
              />

              {modeles.length === 0 ? (
                <p className="py-8 text-center text-body-sm text-on-surface-variant">
                  Aucun modèle ne correspond.
                </p>
              ) : (
                <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1 lg:grid-cols-3">
                  {modeles.map((modele) => (
                    <button
                      key={modele.cle}
                      type="button"
                      onClick={() => onChoisir(modele.construire())}
                      className="group rounded-xl border border-outline-soft text-left transition-colors hover:border-primary hover:shadow-card"
                    >
                      <span className="relative block overflow-hidden rounded-t-xl">
                        <ApercuModeleVisuel apercu={modele.apercu} />
                        <span className="absolute inset-0 flex items-center justify-center bg-on-surface/0 opacity-0 transition-all group-hover:bg-on-surface/40 group-hover:opacity-100">
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest px-3 py-1.5 text-label-lg font-semibold text-primary shadow-drawer">
                            <AddOutlined style={{ fontSize: 16 }} />
                            Ajouter
                          </span>
                        </span>
                      </span>
                      <span className="block px-3 py-2.5">
                        <span className="block text-body-sm font-medium text-on-surface">
                          {modele.libelle}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-label-sm text-outline">
                          {modele.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
