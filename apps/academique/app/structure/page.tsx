"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { Switch } from "@repo/ui/Switch";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { api, type TypeUnite, type Unite } from "@/app/lib/api";
import { libelleAvecParents } from "@/app/lib/ascendance";

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
    // Sans établissement, l'ancien code sortait EN SILENCE : « Ajouter le
    // type » ne faisait rien, et rien ne disait pourquoi. Un type d'unité
    // appartient à un établissement — c'est un état, pas une panne.
    if (!etab) {
      setErreur(
        "Cet espace n'a pas d'établissement : activez Academia depuis " +
          "Workspace › Applications. Un type d'unité appartient à un établissement."
      );
      return;
    }
    if (!nouveauType.cle.trim() || !nouveauType.libelle.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerTypeUnite(etab.id, {
        cle: nouveauType.cle.trim(),
        libelle: nouveauType.libelle.trim(),
        parent_type_id: nouveauType.parent_type_id ? Number(nouveauType.parent_type_id) : null,
        inscriptible_par_defaut: nouveauType.inscriptible_par_defaut,
        position: types.length,
      });
      setNouveauType({
        cle: "",
        libelle: "",
        parent_type_id: "",
        inscriptible_par_defaut: false,
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
    if (!etab) {
      setErreur(
        "Cet espace n'a pas d'établissement : activez Academia depuis " +
          "Workspace › Applications. Une unité appartient à un établissement."
      );
      return;
    }
    if (!nouvelleUnite.type_unite_id || !nouvelleUnite.libelle.trim()) return;
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

  async function chercherType(q: string): Promise<TypeUnite[]> {
    const terme = q.trim().toLowerCase();
    return types.filter((t) => !terme || t.libelle.toLowerCase().includes(terme));
  }

  async function chercherParent(q: string): Promise<Unite[]> {
    const mots = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return parentsPossibles.filter((u) => {
      const foin = libelleAvecParents(u.chemin_libelles).toLowerCase();
      return mots.every((m) => foin.includes(m));
    });
  }
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

        {/* L'établissement ne se crée pas ici — ni nulle part à la main.
            Il naît à l'activation d'Academia pour le workspace, au nom du
            workspace. Cet écran dit donc quoi faire, au lieu de proposer un
            formulaire qui produirait un second chemin de création. */}
        {contexte.pret && !etab && !contexte.erreur && (
          <section className="mb-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <h2 className="text-body-md font-semibold text-on-surface">
              Academia n&apos;est pas encore activée pour cet espace
            </h2>
            <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
              L&apos;établissement naît à l&apos;activation de l&apos;application, au nom de
              l&apos;espace de travail — et tout s&apos;y rattache : types d&apos;unités, unités,
              années, étudiants. Activez Academia depuis{" "}
              <span className="text-on-surface">Workspace › Applications</span>, puis renseignez
              son adresse et ses identifiants légaux dans les paramètres d&apos;Academia.
            </p>
          </section>
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
                {!contexte.pret
                  ? "Chargement…"
                  : etab
                    ? "Aucun type déclaré. Commencez par la racine — « Faculté », « Section »…"
                    : "Rien à déclarer : Academia n'est pas activée pour cet espace."}
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
              <SearchSelect<TypeUnite>
                fetchOptions={chercherType}
                value={nouveauType.parent_type_id ? Number(nouveauType.parent_type_id) : null}
                onChange={(v) =>
                  setNouveauType({ ...nouveauType, parent_type_id: v ? String(v) : "" })
                }
                getOptionLabel={(t) => `sous « ${t.libelle} »`}
                placeholder="Racine — ne se range sous rien"
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
                disabled={
                  busy || !etab || !nouveauType.cle.trim() || !nouveauType.libelle.trim()
                }
                title={etab ? undefined : "Activez Academia pour cet espace."}
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
              {!etab
                ? "Academia n'est pas activée pour cet espace."
                : types.length === 0
                  ? "Aucune unité — et aucun type déclaré. Une unité EST d'un type : déclarez au moins un type racine ci-dessus, le formulaire de création apparaîtra ici."
                  : "Aucune unité. Créez d'abord une racine, ci-dessous."}
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

          {peutGerer && types.length === 0 && unites !== null && unites.length > 0 && (
            <p className="mt-3 border-t border-outline-soft pt-3 text-body-sm text-on-surface-variant">
              Déclarez un type d&apos;unité ci-dessus pour pouvoir en créer une.
            </p>
          )}

          {peutGerer && types.length > 0 && (
            <div className="mt-3 grid gap-2 border-t border-outline-soft pt-3 md:grid-cols-3">
              <SearchSelect<TypeUnite>
                fetchOptions={chercherType}
                value={nouvelleUnite.type_unite_id ? Number(nouvelleUnite.type_unite_id) : null}
                onChange={(v) =>
                  setNouvelleUnite({
                    ...nouvelleUnite,
                    type_unite_id: v ? String(v) : "",
                    parent_id: "",
                  })
                }
                getOptionLabel={(t) => t.libelle}
                placeholder="Type…"
              />
              {/* Le parent se nomme avec SON ascendance : « Math-Info » seul ne
                  dit pas de quelle faculté, et deux départements homonymes
                  existent dès qu'un établissement grandit. */}
              <SearchSelect<Unite>
                fetchOptions={chercherParent}
                value={nouvelleUnite.parent_id ? Number(nouvelleUnite.parent_id) : null}
                onChange={(v) =>
                  setNouvelleUnite({ ...nouvelleUnite, parent_id: v ? String(v) : "" })
                }
                getOptionLabel={(u) => libelleAvecParents(u.chemin_libelles)}
                disabled={!typeChoisi || typeChoisi.parent_type_id === null}
                placeholder={
                  typeChoisi && typeChoisi.parent_type_id === null ? "Racine" : "Rattachée à…"
                }
              />
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
                disabled={
                  busy || !etab || !nouvelleUnite.type_unite_id || !nouvelleUnite.libelle.trim()
                }
                title={etab ? undefined : "Activez Academia pour cet espace."}
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
