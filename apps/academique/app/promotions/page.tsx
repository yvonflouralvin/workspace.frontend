"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AccountTreeOutlined,
  AddOutlined,
  ClassOutlined,
  ReplayOutlined,
} from "@mui/icons-material";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Annee, type Promotion, type Reconduction, type Unite } from "@/app/lib/api";
import { libelleAvecParents } from "@/app/lib/ascendance";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Les promotions de l'année.
 *
 *  Une promotion est un couple — unité qui inscrit, année — et une unité qui
 *  inscrit EST un niveau. L'écran ne propose donc que les unités inscriptibles :
 *  proposer les autres ferait saisir une combinaison que le serveur refusera.
 *
 *  La reconduction rend le compte de ce qu'elle n'a PAS repris. On l'affiche en
 *  entier — c'est précisément ce qu'on risquerait de ne pas voir.
 */
export default function PromotionsPage() {
  const { can } = usePermissions();
  const peutGerer = can("academique.annees.manage");
  const contexte = useContexte();
  const etab = contexte.etablissement;

  const [annees, setAnnees] = useState<Annee[]>([]);
  const [unites, setUnites] = useState<Unite[]>([]);
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rapport, setRapport] = useState<Reconduction | null>(null);

  const [nouvelle, setNouvelle] = useState({ unite_id: "", capacite: "" });
  const [depuis, setDepuis] = useState("");

  const anneeCourante = contexte.annee;

  const charger = useCallback(async () => {
    if (!etab) return;
    try {
      const [a, u] = await Promise.all([
        api.annees(etab.id),
        api.unites(etab.id, { inscriptibles: true }),
      ]);
      // Les listes sont NORMALISÉES avant d'entrer dans l'état.
      //
      // `lire()` renvoie `undefined as T` sur un 204 : le type promet un
      // tableau, l'exécution peut livrer `undefined`. TypeScript ne voit rien,
      // et l'écran casse au premier `.length` — loin d'ici, avec une pile qui
      // désigne le mauvais élément.
      setAnnees(Array.isArray(a) ? a : []);
      setUnites(Array.isArray(u) ? u : []);
      const p = anneeCourante
        ? await api.promotions(etab.id, { annee: anneeCourante.id })
        : [];
      setPromotions(Array.isArray(p) ? p : []);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setPromotions([]);
    }
  }, [etab, anneeCourante]);

  useEffect(() => {
    void charger();
  }, [charger]);

  /** La recherche porte sur TOUTE l'ascendance, pas seulement le libellé.
   *
   *  Taper « droit » doit remonter « Première — Droit Générale — Droit », que
   *  le mot ne se trouve que chez un parent. Chercher sur le seul libellé
   *  obligerait à connaître le nom exact de la classe — or c'est justement ce
   *  qu'on ne sait pas quand plusieurs le partagent. */
  async function chercherUnite(q: string): Promise<Unite[]> {
    const mots = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!mots.length) return unites;
    return unites.filter((u) => {
      const foin = libelleAvecParents(u.chemin_libelles).toLowerCase();
      return mots.every((m) => foin.includes(m));
    });
  }

  async function chercherAnnee(q: string): Promise<Annee[]> {
    const terme = q.trim().toLowerCase();
    return annees
      .filter((a) => a.id !== anneeCourante?.id)
      .filter((a) => !terme || a.libelle.toLowerCase().includes(terme));
  }

  async function creer() {
    if (!etab || !anneeCourante || !nouvelle.unite_id) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerPromotion(etab.id, {
        unite_id: Number(nouvelle.unite_id),
        annee_id: anneeCourante.id,
        capacite: nouvelle.capacite ? Number(nouvelle.capacite) : null,
      });
      setNouvelle({ unite_id: "", capacite: "" });
      setToast("Promotion créée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function ouvrirDepuisStructure() {
    if (!anneeCourante) return;
    setBusy(true);
    setErreur(null);
    try {
      setRapport(await api.ouvrirDepuisStructure(anneeCourante.id));
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ouverture impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function reconduire() {
    if (!anneeCourante || !depuis) return;
    setBusy(true);
    setErreur(null);
    try {
      const resultat = await api.reconduire(anneeCourante.id, Number(depuis));
      setRapport(resultat);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Reconduction impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Promotions</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Les classes de l&apos;année : une unité qui inscrit, une année. Une unité qui
          inscrit EST un niveau — « G1 », « Première » sont des unités de la structure.
        </p>

        <div className="mt-4">
          <BarreContexte
            etablissement={etab}
            surnombre={contexte.surnombre}
            annees={annees}
            annee={anneeCourante}
            onAnnee={contexte.choisirAnnee}
          />
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        {!anneeCourante && (
          <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center text-body-sm text-on-surface-variant">
            Aucune année de travail. Créez-en une dans « Années », puis revenez ici.
          </p>
        )}

        {anneeCourante && (
          <>
            {peutGerer && (
              <section className="mb-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                <div className="grid gap-2 md:grid-cols-3">
                  {/* Recherche plutôt que liste déroulante : un institut porte
                      des centaines d'unités inscriptibles, et « Première »
                      revient dans chaque filière. On cherche par n'importe quel
                      étage — « droit », « première », « math ». */}
                  <SearchSelect<Unite>
                    fetchOptions={chercherUnite}
                    value={nouvelle.unite_id ? Number(nouvelle.unite_id) : null}
                    onChange={(v) => setNouvelle({ ...nouvelle, unite_id: v ? String(v) : "" })}
                    getOptionLabel={(u) => libelleAvecParents(u.chemin_libelles)}
                    placeholder="Où inscrit-on ?"
                  />
                  <input
                    className={CHAMP}
                    type="number"
                    min={1}
                    placeholder="Capacité (facultative)"
                    value={nouvelle.capacite}
                    onChange={(e) => setNouvelle({ ...nouvelle, capacite: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={busy || !nouvelle.unite_id}
                    onClick={creer}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                  >
                    <AddOutlined style={{ fontSize: 16 }} />
                    Créer
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
                  <div className="w-[16rem]">
                    <SearchSelect<Annee>
                      fetchOptions={chercherAnnee}
                      value={depuis ? Number(depuis) : null}
                      onChange={(v) => setDepuis(v ? String(v) : "")}
                      getOptionLabel={(a) => a.libelle}
                      placeholder="Reconduire depuis…"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy || !depuis}
                    onClick={reconduire}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
                  >
                    <ReplayOutlined style={{ fontSize: 16 }} />
                    Reconduire les promotions
                  </button>
                  <span className="text-label-md text-outline">
                    Rouvre ici les mêmes classes que l&apos;année choisie.
                  </span>
                </div>

                {/* L'autre geste de rentrée. Séparé du précédent parce qu'ils
                    ne disent pas la même chose : l'un suit l'année passée,
                    l'autre suit la structure d'aujourd'hui. Les fusionner
                    obligerait à deviner laquelle fait foi quand elles
                    divergent. */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={ouvrirDepuisStructure}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
                  >
                    <AccountTreeOutlined style={{ fontSize: 16 }} />
                    Ouvrir depuis la structure
                  </button>
                  <span className="max-w-[52ch] text-label-md text-outline">
                    Une classe par unité qui accueille des étudiants, telle que la structure
                    est aujourd&apos;hui. Pour la première année, ou après une réorganisation.
                  </span>
                </div>

                {rapport && (
                  <div className="mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm">
                    <p className="font-medium text-on-surface">
                      {rapport.creees} promotion{rapport.creees > 1 ? "s" : ""} reconduite
                      {rapport.creees > 1 ? "s" : ""}.
                    </p>
                    {(rapport.ignorees?.length ?? 0) > 0 && (
                      <>
                        <p className="mt-1 text-on-surface-variant">
                          Non reprises — {rapport.ignorees?.length ?? 0} :
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {(rapport.ignorees ?? []).map((i, n) => (
                            <li key={n} className="text-label-md text-on-surface-variant">
                              <span className="text-on-surface">{i.promotion}</span> — {i.raison}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            {!promotions ? (
              <p className="text-body-sm text-on-surface-variant">Chargement…</p>
            ) : promotions.length === 0 ? (
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
                <ClassOutlined style={{ fontSize: 28 }} className="text-outline" />
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Aucune promotion pour {anneeCourante.libelle}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
                {promotions.map((p) => (
                  <Link
                    key={p.id}
                    href={`/promotions/${p.id}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container-low"
                  >
                    <span className="min-w-0 flex-1">
                      {/* Le libellé SEUL est un homonyme : « Première » existe
                          en Droit comme en Sciences. On nomme donc la classe
                          par son ascendance, et on ne montre son libellé propre
                          que s'il a été retouché. */}
                      <span className="block truncate text-body-md font-medium text-on-surface">
                        {libelleAvecParents(p.unite_chemin_libelles) || p.libelle}
                      </span>
                      <span className="block truncate text-label-md text-outline">
                        {p.libelle !== p.unite_libelle ? `${p.libelle} · ` : ""}
                        {p.annee_libelle}
                      </span>
                    </span>
                    {p.capacite !== null && (
                      <span className="flex-none text-label-md text-outline">
                        {p.capacite} place{p.capacite > 1 ? "s" : ""}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
