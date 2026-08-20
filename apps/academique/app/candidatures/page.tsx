"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { useContexte } from "@/app/lib/etablissement";
import {
  api,
  type Candidature,
  type Promotion,
  type Restriction,
  type TableauCandidatures,
} from "@/app/lib/api";
import {
  BOUTON,
  BOUTON_PLAT,
  Bilan,
  CHAMP,
  Carte,
  Erreur,
  Kpi,
  Pastille,
  Vide,
} from "@/components/Bloc";

const TON: Record<string, string> = {
  DEPOSEE: "attente",
  EN_ATTENTE: "neutre",
  APPROUVEE: "ok",
  REJETEE: "alerte",
  TRANSFEREE: "info",
};

/** Le traitement des candidatures.
 *
 *  Le dépôt, lui, est **public** : il se fait sans compte, sur une page servie
 *  hors de cette application. Ici on examine, on décide, et on transfère — le
 *  transfert étant l'acte qui fait d'un candidat un étudiant.
 */
export default function CandidaturesPage() {
  const { can } = usePermissions();
  const contexte = useContexte();
  const peutTraiter = can("academique.candidatures.traiter");

  const [tableau, setTableau] = useState<TableauCandidatures | null>(null);
  const [dossiers, setDossiers] = useState<Candidature[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [statut, setStatut] = useState("");
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [bilan, setBilan] = useState<{ titre: string; ecarts: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const etab = contexte.etablissement?.id ?? null;
  const annee = contexte.annee?.id ?? null;

  const charger = useCallback(async () => {
    if (!etab || !annee) return;
    try {
      setTableau(await api.tableauCandidatures(etab, annee));
      setDossiers(await api.candidatures(etab, annee, statut ? { statut } : {}));
      setPromotions(await api.promotions(etab));
      setRestrictions(await api.restrictions(etab, annee).catch(() => []));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [etab, annee, statut]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function agir(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setErreur(null);
    try {
      await action();
      setToast(message);
      await charger();
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!peutTraiter) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-[1152px] p-4 md:p-8">
          <p className="text-body-sm text-on-surface-variant">
            Examiner les candidatures demande la permission correspondante.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1152px] space-y-4 p-4 md:p-8">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Candidatures</h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {contexte.annee
              ? `Année ${contexte.annee.libelle}`
              : "Aucune année ouverte : les candidatures s'attachent à une année."}
          </p>
        </div>

        <Erreur message={erreur} />
        {bilan && (
          <Bilan
            titre={bilan.titre}
            ecarts={bilan.ecarts}
            ton={bilan.ecarts.length ? "alerte" : "info"}
            onFermer={() => setBilan(null)}
          />
        )}

        {tableau && (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi valeur={tableau.total} libelle="dossiers déposés" />
              <Kpi
                valeur={tableau.par_unite.reduce((s, u) => s + u.deposees + u.en_attente, 0)}
                libelle="à examiner"
              />
              <Kpi
                valeur={tableau.par_unite.reduce((s, u) => s + u.approuvees, 0)}
                libelle="approuvés"
              />
              <div className="rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2.5">
                <Pastille ton={tableau.ouvertes ? "ok" : "neutre"}>
                  Dépôt {tableau.ouvertes ? "ouvert" : "fermé"}
                </Pastille>
                <p className="mt-1 text-label-md text-outline">
                  réglage « candidatures_ouvertes »
                </p>
              </div>
            </div>

            {/* Les restrictions par unité : fermer une faculté ne ferme pas les
                autres, et l'écran doit dire laquelle est suspendue. */}
            {restrictions.length > 0 && (
              <Carte titre="Filières suspendues">
                <div className="divide-y divide-hairline">
                  {restrictions.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                        {r.unite_libelle}
                        {r.motif && (
                          <span className="ml-2 text-label-md text-outline">{r.motif}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          agir(() => api.leverRestriction(r.id), "Restriction levée.")
                        }
                        className="text-label-md font-semibold text-primary hover:underline"
                      >
                        Lever
                      </button>
                    </div>
                  ))}
                </div>
              </Carte>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            État
            <select
              aria-label="Filtrer par état"
              className={CHAMP}
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
            >
              <option value="">Tous</option>
              <option value="DEPOSEE">Déposées</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="APPROUVEE">Approuvées</option>
              <option value="REJETEE">Rejetées</option>
              <option value="TRANSFEREE">Transférées</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !etab || !annee}
            onClick={async () => {
              const r = await api
                .deciderCandidaturesEnMasse(etab!, { annee_id: annee!, statut: "APPROUVEE" })
                .catch((e) => {
                  setErreur(e instanceof Error ? e.message : "Action impossible.");
                  return null;
                });
              if (r) {
                setBilan({ titre: `${r.traitees} candidature(s) approuvée(s)`, ecarts: r.ignorees });
                await charger();
              }
            }}
            className={BOUTON_PLAT}
          >
            Approuver tous les dossiers ouverts
          </button>
        </div>

        <Carte
          titre="Dossiers"
          sousTitre="Un pourcentage sous le seuil est MARQUÉ, jamais refusé tout seul : c'est un humain qui tranche."
        >
          {dossiers.length === 0 ? (
            <Vide message="Aucune candidature pour ce filtre." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse">
                <thead>
                  <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                    <th className="px-4 py-2 text-left font-medium">Référence</th>
                    <th className="px-2 py-2 text-left font-medium">Candidat</th>
                    <th className="px-2 py-2 text-left font-medium">Choix</th>
                    <th className="w-[6rem] px-2 py-2 text-right font-medium">Diplôme</th>
                    <th className="w-[8rem] px-2 py-2 text-left font-medium">Dossier</th>
                    <th className="w-[13rem] px-4 py-2 text-left font-medium">État</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.map((d) => (
                    <Fragment key={d.id}>
                      <tr
                        onClick={() => setOuvert(ouvert === d.id ? null : d.id)}
                        className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-container-low"
                      >
                        <td className="px-4 py-1.5 font-mono text-label-md text-outline">
                          {d.reference}
                        </td>
                        <td className="px-2 py-1.5 text-body-sm text-on-surface">
                          {d.nom_complet}
                        </td>
                        <td className="px-2 py-1.5 text-label-md text-on-surface-variant">
                          {d.choix_unite_libelle} · {d.choix_niveau}
                        </td>
                        <td className="px-2 py-1.5 text-right text-body-sm tabular-nums text-on-surface">
                          {d.pourcentage_diplome ?? "—"}
                          {d.sous_le_seuil && (
                            <span className="ml-1 text-error" title="Sous le seuil attendu">
                              !
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="text-label-md text-on-surface-variant">
                            {d.dossier_physique_complet ? "complet" : "incomplet"}
                            {d.frais_regles ? " · payé" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-1.5">
                          <Pastille ton={TON[d.statut] ?? "neutre"}>{d.statut_libelle}</Pastille>
                        </td>
                      </tr>

                      {ouvert === d.id && (
                        <tr className="bg-surface-container-low">
                          <td colSpan={6} className="space-y-3 px-4 py-3">
                            <div className="grid gap-1 text-label-md text-on-surface-variant">
                              <span>
                                {d.sexe === "F" ? "Née" : "Né"} le {d.date_naissance ?? "—"} ·{" "}
                                {d.telephone ?? "—"} · {d.email ?? "—"}
                              </span>
                              <span>
                                {d.titre_diplome ?? "—"} en {d.annee_terminale ?? "—"} à{" "}
                                {d.etablissement_terminal ?? "—"} ({d.section_terminale ?? "—"})
                              </span>
                              {d.parcours.map((p) => (
                                <span key={p.id}>
                                  {p.annee} · {p.etablissement} · {p.section} ·{" "}
                                  {p.document_obtenu} {p.pourcentage ?? ""}
                                </span>
                              ))}
                              {d.decision_motif && <span>Décision : {d.decision_motif}</span>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  agir(
                                    () =>
                                      api.marquerDossier(d.id, {
                                        dossier_physique_complet: !d.dossier_physique_complet,
                                      }),
                                    "Dossier physique mis à jour."
                                  )
                                }
                                className={BOUTON_PLAT}
                              >
                                {d.dossier_physique_complet
                                  ? "Marquer incomplet"
                                  : "Marquer complet"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  agir(
                                    () => api.marquerDossier(d.id, { frais_regles: !d.frais_regles }),
                                    "Frais mis à jour."
                                  )
                                }
                                className={BOUTON_PLAT}
                              >
                                {d.frais_regles ? "Frais non réglés" : "Frais réglés"}
                              </button>

                              {d.statut !== "TRANSFEREE" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      agir(
                                        () => api.deciderCandidature(d.id, "APPROUVEE"),
                                        "Candidature approuvée."
                                      )
                                    }
                                    className={BOUTON}
                                  >
                                    Approuver
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      agir(
                                        () => api.deciderCandidature(d.id, "EN_ATTENTE"),
                                        "Mise en attente."
                                      )
                                    }
                                    className={BOUTON_PLAT}
                                  >
                                    Mettre en attente
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      const motif = window.prompt(
                                        "Motif du rejet ? Le candidat doit savoir ce qui a manqué."
                                      );
                                      if (!motif) return;
                                      void agir(
                                        () => api.deciderCandidature(d.id, "REJETEE", motif),
                                        "Candidature rejetée."
                                      );
                                    }}
                                    className={BOUTON_PLAT}
                                  >
                                    Rejeter
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Le transfert : l'acte qui fait d'un candidat un
                                étudiant. Il est idempotent côté serveur. */}
                            {d.statut === "APPROUVEE" && (
                              <div className="flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
                                <select
                                  aria-label="Promotion d'arrivée"
                                  className={CHAMP}
                                  id={`promo-${d.id}`}
                                >
                                  <option value="">Promotion d&apos;arrivée…</option>
                                  {promotions
                                    .filter((p) => p.annee_id === d.annee_id)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.libelle}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    const choix = (
                                      document.getElementById(
                                        `promo-${d.id}`
                                      ) as HTMLSelectElement | null
                                    )?.value;
                                    if (!choix) {
                                      setErreur("Choisissez la promotion d'arrivée.");
                                      return;
                                    }
                                    void agir(async () => {
                                      const t = await api.transfererCandidature(
                                        d.id,
                                        Number(choix)
                                      );
                                      setToast(`Inscrit — matricule ${t.matricule}`);
                                    }, "Candidat inscrit.");
                                  }}
                                  className={BOUTON}
                                >
                                  Inscrire dans la promotion
                                </button>
                              </div>
                            )}
                            {d.statut === "TRANSFEREE" && (
                              <p className="text-label-md text-on-surface-variant">
                                Déjà inscrit — étudiant n° {d.etudiant_id}.
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Carte>

        {tableau && tableau.par_unite.length > 0 && (
          <Carte titre="Par filière">
            <div className="divide-y divide-hairline">
              {tableau.par_unite.map((u) => (
                <div key={u.unite_id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                    {u.unite_libelle}
                  </span>
                  <span className="text-label-md tabular-nums text-on-surface-variant">
                    {u.total} dossiers · {u.deposees + u.en_attente} à examiner ·{" "}
                    {u.approuvees} approuvés · {u.transferees} inscrits
                  </span>
                </div>
              ))}
            </div>
          </Carte>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
