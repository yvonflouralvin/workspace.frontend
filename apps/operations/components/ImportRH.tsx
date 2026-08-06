"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@repo/network/client";
import { operationsApi } from "@/lib/operations-api";

interface EmployeRH {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string | null;
  group_name: string;
  user_id: number | null;
}

/** Choisir dans l'annuaire RH qui devient planifiable.
 *
 *  On IMPORTE une sélection, pas tout le personnel : la planification concerne
 *  ceux qui interviennent sur le terrain, pas la comptabilité. Créer une
 *  ressource pour chaque employé encombrerait chaque liste de choix.
 *
 *  Seule la référence et le nom sont copiés — RH reste propriétaire de la fiche. */
export function ImportRH({ onClose, onDone }: { onClose: () => void; onDone: (n: number) => void }) {
  const [employes, setEmployes] = useState<EmployeRH[] | null>(null);
  const [dejaPris, setDejaPris] = useState<Set<number>>(new Set());
  const [choisis, setChoisis] = useState<Set<number>>(new Set());
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [r, existantes] = await Promise.all([
          apiFetch("/api/rh/employees").then((x) => x.json() as Promise<EmployeRH[]>),
          operationsApi.ressources({ type: "PRESTATION", page: 1 }),
        ]);
        setEmployes(r);
        setDejaPris(new Set(existantes.items.map((x) => x.employee_id).filter(Boolean) as number[]));
      } catch (e) {
        setErreur(
          e instanceof Error
            ? `Annuaire RH indisponible — ${e.message}`
            : "Annuaire RH indisponible.",
        );
        setEmployes([]);
      }
    })();
  }, []);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const tous = employes ?? [];
    if (!q) return tous;
    return tous.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.email} ${e.job_title ?? ""} ${e.group_name}`
        .toLowerCase()
        .includes(q),
    );
  }, [employes, recherche]);

  async function importer() {
    setEnCours(true);
    setErreur(null);
    let n = 0;
    for (const id of choisis) {
      const e = (employes ?? []).find((x) => x.id === id);
      if (!e) continue;
      try {
        await operationsApi.creerRessource({
          type: "PRESTATION",
          libelle: `${e.first_name} ${e.last_name}`.trim(),
          categorie: e.job_title,
          employee_id: e.id,
          user_id: e.user_id,
          nom_cache: e.last_name,
          prenom_cache: e.first_name,
        });
        n += 1;
      } catch {
        // Un import qui échoue sur une personne ne doit pas annuler les autres :
        // l'écran se recharge et montre ce qui est passé.
      }
    }
    setEnCours(false);
    onDone(n);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="flex w-full max-w-[34rem] flex-col rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">Importer depuis les RH</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Choisissez qui doit devenir planifiable. Leur fiche reste gérée dans RH.
          </p>
        </div>

        <div className="px-5 pt-3">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un poste, un département…"
            className="h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
          />
        </div>

        <div className="max-h-[45vh] overflow-y-auto px-5 py-3">
          {erreur && <p className="mb-2 text-body-sm text-error">{erreur}</p>}
          {employes === null ? (
            <p className="text-body-sm text-on-surface-variant">Chargement…</p>
          ) : visibles.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Aucun employé ne correspond.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {visibles.map((e) => {
                const pris = dejaPris.has(e.id);
                return (
                  <li key={e.id}>
                    <label
                      className={`flex items-center gap-3 rounded-lg px-2 py-2 ${pris ? "opacity-50" : "hover:bg-surface-container-low"}`}
                    >
                      <input
                        type="checkbox"
                        disabled={pris}
                        checked={choisis.has(e.id)}
                        onChange={(ev) => {
                          const suite = new Set(choisis);
                          if (ev.target.checked) suite.add(e.id);
                          else suite.delete(e.id);
                          setChoisis(suite);
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-on-surface">
                          {e.first_name} {e.last_name}
                          {pris && <span className="ml-2 text-label-md text-outline">déjà importé</span>}
                        </span>
                        <span className="block truncate text-label-md text-on-surface-variant">
                          {[e.job_title, e.group_name].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-outline-soft px-5 py-3">
          <span className="text-label-md text-on-surface-variant">
            {choisis.size} sélectionné{choisis.size > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={enCours || choisis.size === 0}
              onClick={importer}
              className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
            >
              {enCours ? "…" : "Importer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
