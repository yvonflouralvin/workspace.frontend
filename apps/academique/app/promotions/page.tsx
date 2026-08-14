"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AddOutlined, ClassOutlined, ReplayOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Annee, type Promotion, type Reconduction, type Unite } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Les promotions de l'année.
 *
 *  Une promotion est un triplet — unité qui inscrit, niveau, année. L'écran ne
 *  propose donc que les unités inscriptibles, et que les niveaux déclarés par
 *  celle qu'on a choisie : proposer le reste ferait saisir une combinaison que
 *  le serveur refusera.
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

  const [nouvelle, setNouvelle] = useState({ unite_id: "", niveau: "", capacite: "" });
  const [depuis, setDepuis] = useState("");

  const anneeCourante = contexte.annee;

  const charger = useCallback(async () => {
    if (!etab) return;
    try {
      const [a, u] = await Promise.all([
        api.annees(etab.id),
        api.unites(etab.id, { inscriptibles: true }),
      ]);
      setAnnees(a);
      setUnites(u);
      setPromotions(
        anneeCourante ? await api.promotions(etab.id, { annee: anneeCourante.id }) : []
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setPromotions([]);
    }
  }, [etab, anneeCourante]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const uniteChoisie = unites.find((u) => u.id === Number(nouvelle.unite_id));

  async function creer() {
    if (!etab || !anneeCourante || !nouvelle.unite_id || !nouvelle.niveau) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerPromotion(etab.id, {
        unite_id: Number(nouvelle.unite_id),
        niveau: nouvelle.niveau,
        annee_id: anneeCourante.id,
        capacite: nouvelle.capacite ? Number(nouvelle.capacite) : null,
      });
      setNouvelle({ unite_id: "", niveau: "", capacite: "" });
      setToast("Promotion créée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
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
          Les classes de l&apos;année : une unité qui inscrit, un niveau, une année.
        </p>

        <div className="mt-4">
          <BarreContexte
            etablissements={contexte.etablissements}
            etablissement={etab}
            onEtablissement={contexte.setEtablissement}
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
                <div className="grid gap-2 md:grid-cols-4">
                  <select
                    aria-label="Unité"
                    className={CHAMP}
                    value={nouvelle.unite_id}
                    onChange={(e) =>
                      setNouvelle({ ...nouvelle, unite_id: e.target.value, niveau: "" })
                    }
                  >
                    <option value="">Où inscrit-on ?</option>
                    {unites.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.libelle}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Niveau"
                    className={CHAMP}
                    disabled={!uniteChoisie}
                    value={nouvelle.niveau}
                    onChange={(e) => setNouvelle({ ...nouvelle, niveau: e.target.value })}
                  >
                    <option value="">Niveau…</option>
                    {(uniteChoisie?.niveaux ?? []).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
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
                    disabled={busy || !nouvelle.unite_id || !nouvelle.niveau}
                    onClick={creer}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                  >
                    <AddOutlined style={{ fontSize: 16 }} />
                    Créer
                  </button>
                </div>

                {uniteChoisie && uniteChoisie.niveaux.length === 0 && (
                  <p className="mt-2 text-label-md text-error">
                    « {uniteChoisie.libelle} » ne déclare aucun niveau : ajoutez-les dans
                    Structure avant de créer une promotion.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
                  <select
                    aria-label="Reconduire depuis"
                    className={CHAMP}
                    value={depuis}
                    onChange={(e) => setDepuis(e.target.value)}
                  >
                    <option value="">Reconduire depuis…</option>
                    {annees
                      .filter((a) => a.id !== anneeCourante.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.libelle}
                        </option>
                      ))}
                  </select>
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

                {rapport && (
                  <div className="mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm">
                    <p className="font-medium text-on-surface">
                      {rapport.creees} promotion{rapport.creees > 1 ? "s" : ""} reconduite
                      {rapport.creees > 1 ? "s" : ""}.
                    </p>
                    {rapport.ignorees.length > 0 && (
                      <>
                        <p className="mt-1 text-on-surface-variant">
                          Non reprises — {rapport.ignorees.length} :
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {rapport.ignorees.map((i, n) => (
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

            {promotions === null ? (
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
                      <span className="block truncate text-body-md font-medium text-on-surface">
                        {p.libelle}
                      </span>
                      <span className="block truncate text-label-md text-outline">
                        {p.unite_libelle} · {p.annee_libelle}
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
