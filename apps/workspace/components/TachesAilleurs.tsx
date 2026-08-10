"use client";

import { useEffect, useState } from "react";
import { OpenInNewOutlined } from "@mui/icons-material";
import { apiFetch } from "@repo/network/client";

export interface TacheExterne {
  id: number;
  app_key: string;
  titre: string;
  description: string | null;
  lien: string;
}

const LIBELLE_APP: Record<string, string> = {
  approval_flows: "Approbations",
};

/** Ce que d'autres applications attendent de moi.
 *
 *  Une demande qui attend ma décision est une chose à faire, au même titre
 *  qu'une tâche de projet — mais elle n'a ni état, ni priorité, ni échéance, et
 *  je ne la termine pas ici : je la termine en décidant, là où elle se joue.
 *
 *  D'où un bloc à part plutôt qu'une fusion dans la liste : les mêler
 *  obligerait à leur inventer des colonnes vides, et à faire croire qu'on peut
 *  les cocher.
 */
export function TachesAilleurs() {
  const [taches, setTaches] = useState<TacheExterne[]>([]);

  useEffect(() => {
    apiFetch("/api/taches-externes")
      .then((r) => (r.ok ? r.json() : []))
      .then((liste) => setTaches(Array.isArray(liste) ? liste : []))
      // Une panne ici ne doit pas emporter l'écran des tâches de projet.
      .catch(() => setTaches([]));
  }, []);

  if (taches.length === 0) return null;

  return (
    <section className="mt-5 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body-md font-semibold text-on-surface">On attend quelque chose de vous</h2>
        <span className="text-label-md text-outline">
          {taches.length} en attente
        </span>
      </div>
      <div className="mt-3 divide-y divide-hairline">
        {taches.map((tache) => (
          <a
            key={tache.id}
            href={tache.lien}
            // L'action se fait dans l'application d'origine : on ouvre à côté
            // plutôt que d'éjecter l'utilisateur de sa liste.
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="mt-0.5 flex-none rounded-full bg-tertiary/15 px-2 py-0.5 text-label-sm text-tertiary">
              {LIBELLE_APP[tache.app_key] ?? tache.app_key}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-body-sm font-medium text-on-surface group-hover:text-primary">
                <span className="truncate">{tache.titre}</span>
                <OpenInNewOutlined style={{ fontSize: 13 }} className="flex-none text-outline" />
              </span>
              {tache.description && (
                <span className="mt-0.5 block truncate text-label-md text-on-surface-variant">
                  {tache.description}
                </span>
              )}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
