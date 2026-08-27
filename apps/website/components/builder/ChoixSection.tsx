"use client";

import { useState } from "react";
import { Modal } from "@repo/ui/Modal";

import { DISPOSITIONS, creerSectionDisposition } from "@repo/site-widgets/catalogue";
import { MODELES } from "@repo/site-widgets/modeles";
import type { Noeud } from "@repo/site-widgets/types";

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
 */
export function ChoixSection({
  onChoisir,
  onFermer,
}: {
  onChoisir: (section: Noeud) => void;
  onFermer: () => void;
}) {
  const [onglet, setOnglet] = useState<"vide" | "modeles">("vide");

  return (
    <Modal title="Ajouter une section" onClose={onFermer} width="max-w-[40rem]">
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {[
            { cle: "vide", libelle: "Section vide" },
            { cle: "modeles", libelle: "Sections toutes faites" },
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
          <>
            <p className="text-body-sm text-on-surface-variant">
              Une section déjà remplie, à retoucher. Une fois posée, ce ne sont plus que des
              blocs ordinaires.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODELES.map((modele) => (
                <button
                  key={modele.cle}
                  type="button"
                  onClick={() => onChoisir(modele.construire())}
                  className="rounded-xl border border-outline-soft p-3 text-left transition-colors hover:border-primary"
                >
                  <span className="flex h-8 flex-col justify-center gap-1 rounded border border-outline-soft p-1">
                    {modele.apercu.map((ligne, i) => (
                      <span key={i} className="flex gap-1">
                        {ligne.map((part, j) => (
                          <span
                            key={j}
                            style={{ flexGrow: part }}
                            className="h-2.5 rounded-sm bg-outline-variant"
                          />
                        ))}
                      </span>
                    ))}
                  </span>
                  <span className="mt-2 block text-body-sm text-on-surface">
                    {modele.libelle}
                  </span>
                  <span className="mt-0.5 block text-label-sm text-outline">
                    {modele.description}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
