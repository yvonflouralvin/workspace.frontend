"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/contexte";
import { api, type Directeur, type Reglages } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const TYPES = [
  { cle: "MEMOIRE", libelle: "Mémoire" },
  { cle: "PROJET_TUTORE", libelle: "Projet tutoré" },
  { cle: "STAGE", libelle: "Stage" },
];

/** Le référentiel : directeurs de travaux et plafonds du département.
 *
 *  Ce sont les fonctions propres à l'ISP — Academia connaît des enseignants,
 *  pas des « directeurs de mémoire du département X ».
 */
export default function ReferentielPage() {
  const { can } = usePermissions();
  const peutGerer = can("isp.referentiel.manage");
  const contexte = useContexte();

  const [directeurs, setDirecteurs] = useState<Directeur[]>([]);
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({ nom: "", type_travail: "MEMOIRE", externe: false });

  const unite = contexte.unite;

  const charger = useCallback(async () => {
    if (!unite) return;
    try {
      const [dirs, regs] = await Promise.all([
        api.directeurs({ unite: unite.id }),
        api.reglages(unite.id),
      ]);
      setDirecteurs(dirs);
      setReglages(regs);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [unite]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function regler(champ: keyof Reglages, valeur: string) {
    if (!unite) return;
    try {
      await api.reglerDepartement(unite.id, {
        [champ]: valeur === "" ? null : Number(valeur),
      });
      setToast("Plafond enregistré.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Réglage impossible.");
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[900px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Référentiel</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Qui dirige quoi dans ce département, et combien de travaux chacun peut encadrer.
        </p>

        <div className="mt-4">
          <BarreContexte
            unites={contexte.unites}
            unite={unite}
            onUnite={contexte.setUnite}
            annee={contexte.annee}
          />
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Directeurs de travaux</h2>
          <div className="mt-2 divide-y divide-hairline">
            {directeurs.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 text-body-sm text-on-surface">{d.nom}</span>
                <span className="flex-none text-label-md text-outline">
                  {TYPES.find((t) => t.cle === d.type_travail)?.libelle ?? d.type_travail}
                  {d.externe && " · extérieur"}
                </span>
              </div>
            ))}
            {directeurs.length === 0 && (
              <p className="py-3 text-body-sm text-on-surface-variant">
                Aucun directeur désigné pour ce département.
              </p>
            )}
          </div>

          {peutGerer && unite && (
            <div className="mt-3 grid gap-2 border-t border-outline-soft pt-3 md:grid-cols-4">
              <input
                className={`${CHAMP} md:col-span-2`}
                placeholder="Nom du directeur"
                value={nouveau.nom}
                onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
              />
              <select
                aria-label="Type de travail"
                className={CHAMP}
                value={nouveau.type_travail}
                onChange={(e) => setNouveau({ ...nouveau, type_travail: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t.cle} value={t.cle}>
                    {t.libelle}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!nouveau.nom.trim()}
                onClick={async () => {
                  try {
                    await api.creerDirecteur({
                      unite_id: unite.id,
                      nom: nouveau.nom.trim(),
                      type_travail: nouveau.type_travail,
                      externe: nouveau.externe,
                    });
                    setNouveau({ nom: "", type_travail: "MEMOIRE", externe: false });
                    setToast("Directeur désigné.");
                    await charger();
                  } catch (e) {
                    setErreur(e instanceof Error ? e.message : "Désignation impossible.");
                  }
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Désigner
              </button>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Plafonds du département</h2>
          <p className="mt-0.5 text-label-md text-outline">
            Laissez vide pour ne poser aucun plafond. Un directeur qui encadre trente mémoires
            ne les encadre pas.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(
              [
                ["max_memoires_par_directeur", "Mémoires par directeur"],
                ["max_projets_par_directeur", "Projets par directeur"],
                ["max_membres_par_projet", "Membres par projet"],
              ] as const
            ).map(([champ, libelle]) => (
              <label key={champ} className="text-body-sm text-on-surface-variant">
                {libelle}
                <input
                  type="number"
                  min={1}
                  disabled={!peutGerer}
                  className={`${CHAMP} mt-1 w-full`}
                  defaultValue={reglages?.[champ] ?? ""}
                  onBlur={(e) => regler(champ, e.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
