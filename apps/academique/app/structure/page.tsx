"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";
import { Switch } from "@repo/ui/Switch";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { api, type TypeUnite, type Unite } from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** La structure de l'établissement.
 *
 *  Deux écrans en un, et dans cet ordre : **les types d'abord**, l'arbre
 *  ensuite. On ne peut pas créer une faculté avant d'avoir dit que « Faculté »
 *  existe — et c'est précisément ce qui rend Academia utilisable par une
 *  université comme par une école.
 *
 *  L'arbre se rend à plat, indenté par la profondeur : le serveur le renvoie
 *  ordonné par chemin, l'écran n'a qu'à décaler. Reconstruire un arbre imbriqué
 *  côté client obligerait à choisir une profondeur maximale.
 */
export default function StructurePage() {
  const { can } = usePermissions();
  const peutGerer = can("academique.structure.manage");
  const contexte = useContexte();
  const etab = contexte.etablissement;

  const [types, setTypes] = useState<TypeUnite[]>([]);
  const [unites, setUnites] = useState<Unite[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nouveauType, setNouveauType] = useState({
    cle: "",
    libelle: "",
    parent_type_id: "",
    inscriptible_par_defaut: false,
    niveaux: "",
  });
  const [nouvelleUnite, setNouvelleUnite] = useState({
    type_unite_id: "",
    parent_id: "",
    libelle: "",
  });

  const charger = useCallback(async () => {
    if (!etab) return;
    try {
      const [t, u] = await Promise.all([api.typesUnite(etab.id), api.unites(etab.id)]);
      setTypes(t);
      setUnites(u);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setUnites([]);
    }
  }, [etab]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function creerType() {
    if (!etab || !nouveauType.cle.trim() || !nouveauType.libelle.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerTypeUnite(etab.id, {
        cle: nouveauType.cle.trim(),
        libelle: nouveauType.libelle.trim(),
        parent_type_id: nouveauType.parent_type_id ? Number(nouveauType.parent_type_id) : null,
        inscriptible_par_defaut: nouveauType.inscriptible_par_defaut,
        niveaux_par_defaut: nouveauType.niveaux
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean),
        position: types.length,
      });
      setNouveauType({
        cle: "",
        libelle: "",
        parent_type_id: "",
        inscriptible_par_defaut: false,
        niveaux: "",
      });
      setToast("Type d'unité ajouté.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ajout impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function creerUnite() {
    if (!etab || !nouvelleUnite.type_unite_id || !nouvelleUnite.libelle.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerUnite(etab.id, {
        type_unite_id: Number(nouvelleUnite.type_unite_id),
        parent_id: nouvelleUnite.parent_id ? Number(nouvelleUnite.parent_id) : null,
        libelle: nouvelleUnite.libelle.trim(),
      });
      setNouvelleUnite({ type_unite_id: "", parent_id: "", libelle: "" });
      setToast("Unité créée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  const typeChoisi = types.find((t) => t.id === Number(nouvelleUnite.type_unite_id));
  // Seules les unités du TYPE PARENT attendu peuvent accueillir la nouvelle :
  // proposer les autres ferait choisir un rattachement que le serveur refusera.
  const parentsPossibles = (unites ?? []).filter(
    (u) => typeChoisi && u.type_unite_id === typeChoisi.parent_type_id
  );

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Structure</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Déclarez d&apos;abord les étages de votre établissement — faculté, département,
          filière, section… — puis construisez l&apos;arbre. Une unité marquée
          « accueille des étudiants » est celle où l&apos;on inscrit.
        </p>

        <div className="mt-4">
          <BarreContexte
            etablissement={etab}
            surnombre={contexte.surnombre}
          />
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        {/* ── Les types ── */}
        <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Types d&apos;unité</h2>
          <p className="mt-0.5 text-label-md text-outline">
            Chaque type dit sous quel autre il se range. Un type sans parent est une racine.
          </p>

          <div className="mt-3 divide-y divide-hairline">
            {types.map((t) => {
              const parent = types.find((p) => p.id === t.parent_type_id);
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm text-on-surface">{t.libelle}</span>
                    <span className="block text-label-md text-outline">
                      {parent ? `sous « ${parent.libelle} »` : "racine"}
                      {t.niveaux_par_defaut.length > 0 &&
                        ` · niveaux : ${t.niveaux_par_defaut.join(", ")}`}
                    </span>
                  </span>
                  {t.inscriptible_par_defaut && (
                    <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-label-md text-secondary">
                      inscrit
                    </span>
                  )}
                </div>
              );
            })}
            {types.length === 0 && (
              <p className="py-3 text-body-sm text-on-surface-variant">
                Aucun type déclaré. Commencez par la racine — « Faculté », « Section »…
              </p>
            )}
          </div>

          {peutGerer && (
            <div className="mt-3 grid gap-2 border-t border-outline-soft pt-3 md:grid-cols-2">
              <input
                className={CHAMP}
                placeholder="Clé (ex. departement)"
                value={nouveauType.cle}
                onChange={(e) => setNouveauType({ ...nouveauType, cle: e.target.value })}
              />
              <input
                className={CHAMP}
                placeholder="Libellé (ex. Département)"
                value={nouveauType.libelle}
                onChange={(e) => setNouveauType({ ...nouveauType, libelle: e.target.value })}
              />
              <select
                aria-label="Se range sous"
                className={CHAMP}
                value={nouveauType.parent_type_id}
                onChange={(e) =>
                  setNouveauType({ ...nouveauType, parent_type_id: e.target.value })
                }
              >
                <option value="">Racine — ne se range sous rien</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    sous « {t.libelle} »
                  </option>
                ))}
              </select>
              <input
                className={CHAMP}
                placeholder="Niveaux, séparés par des virgules (L1, L2, L3)"
                value={nouveauType.niveaux}
                onChange={(e) => setNouveauType({ ...nouveauType, niveaux: e.target.value })}
              />
              <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                <Switch
                  checked={nouveauType.inscriptible_par_defaut}
                  onChange={(v) =>
                    setNouveauType({ ...nouveauType, inscriptible_par_defaut: v })
                  }
                  label="Accueille des étudiants"
                />
                Les unités de ce type accueillent des étudiants
              </label>
              <button
                type="button"
                disabled={busy || !nouveauType.cle.trim() || !nouveauType.libelle.trim()}
                onClick={creerType}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter le type
              </button>
            </div>
          )}
        </section>

        {/* ── L'arbre ── */}
        <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Organisation</h2>

          {unites === null ? (
            <p className="mt-2 text-body-sm text-on-surface-variant">Chargement…</p>
          ) : unites.length === 0 ? (
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Aucune unité. Créez d&apos;abord une racine.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-hairline">
              {unites.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-2 py-2"
                  style={{ paddingLeft: `${u.profondeur * 20}px` }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm text-on-surface">
                      {u.libelle}
                    </span>
                    <span className="block text-label-md text-outline">
                      {u.type_libelle}
                      {u.niveaux.length > 0 && ` · ${u.niveaux.join(", ")}`}
                    </span>
                  </span>
                  {peutGerer && (
                    <label className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
                      <Switch
                        checked={u.peut_inscrire}
                        disabled={busy}
                        onChange={async (v) => {
                          try {
                            await api.modifierUnite(u.id, { peut_inscrire: v });
                            await charger();
                          } catch (e) {
                            setErreur(e instanceof Error ? e.message : "Réglage impossible.");
                          }
                        }}
                        label={`${u.libelle} accueille des étudiants`}
                      />
                      inscrit
                    </label>
                  )}
                  {peutGerer && (
                    <button
                      type="button"
                      aria-label={`Supprimer ${u.libelle}`}
                      disabled={busy}
                      onClick={async () => {
                        try {
                          await api.supprimerUnite(u.id);
                          setToast("Unité supprimée.");
                          await charger();
                        } catch (e) {
                          setErreur(e instanceof Error ? e.message : "Suppression impossible.");
                        }
                      }}
                      className="flex-none text-outline transition-colors hover:text-error"
                    >
                      <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {peutGerer && types.length > 0 && (
            <div className="mt-3 grid gap-2 border-t border-outline-soft pt-3 md:grid-cols-3">
              <select
                aria-label="Type de l'unité"
                className={CHAMP}
                value={nouvelleUnite.type_unite_id}
                onChange={(e) =>
                  setNouvelleUnite({
                    ...nouvelleUnite,
                    type_unite_id: e.target.value,
                    parent_id: "",
                  })
                }
              >
                <option value="">Type…</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.libelle}
                  </option>
                ))}
              </select>
              <select
                aria-label="Rattachée à"
                className={CHAMP}
                disabled={!typeChoisi || typeChoisi.parent_type_id === null}
                value={nouvelleUnite.parent_id}
                onChange={(e) =>
                  setNouvelleUnite({ ...nouvelleUnite, parent_id: e.target.value })
                }
              >
                <option value="">
                  {typeChoisi && typeChoisi.parent_type_id === null
                    ? "Racine"
                    : "Rattachée à…"}
                </option>
                {parentsPossibles.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.libelle}
                  </option>
                ))}
              </select>
              <input
                className={CHAMP}
                placeholder="Libellé"
                value={nouvelleUnite.libelle}
                onChange={(e) =>
                  setNouvelleUnite({ ...nouvelleUnite, libelle: e.target.value })
                }
              />
              <button
                type="button"
                disabled={busy || !nouvelleUnite.type_unite_id || !nouvelleUnite.libelle.trim()}
                onClick={creerUnite}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50 md:col-start-3"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Créer l&apos;unité
              </button>
            </div>
          )}
        </section>

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
