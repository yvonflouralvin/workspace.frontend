"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useContexte } from "@/app/lib/etablissement";
import {
  api,
  type Defense,
  type Enseignant,
  type Programme,
  type Projet,
  type SuiviProjets,
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
import { usePromotion } from "../promotion-context";

const TON_SUJET: Record<string, string> = {
  BROUILLON: "neutre",
  SOUMIS: "attente",
  APPROUVE: "ok",
  REFUSE: "alerte",
};

const TON_DEFENSE: Record<string, string> = {
  PLANIFIEE: "neutre",
  COTATION_OUVERTE: "attente",
  COTEE: "info",
  PROCLAMEE: "ok",
};

/** Projets de fin de cycle et défenses, sur le même écran.
 *
 *  Une défense se pose sur un projet : les séparer obligerait à naviguer entre
 *  deux listes pour savoir si un dossier est soutenable. L'avancement est
 *  **calculé** — « la commission peut travailler » suit les quatre jalons, il ne
 *  se lève pas à la main.
 */
export default function RecherchePage() {
  const { promotionId } = usePromotion();
  const { can } = usePermissions();
  const contexte = useContexte();
  const peutGerer = can("academique.projets.gerer");
  const peutOrganiser = can("academique.soutenances.manage");

  const [suivi, setSuivi] = useState<SuiviProjets | null>(null);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      setSuivi(await api.suiviProjets(promotionId));
      setProjets(await api.projets(promotionId));
      setDefenses(await api.defenses(promotionId));
      setProgramme(await api.programme(promotionId));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [promotionId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (!contexte.etablissement) return;
    void api.enseignants(contexte.etablissement.id).then(setEnseignants).catch(() => {});
  }, [contexte.etablissement]);

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

  const parProjet = Object.fromEntries(defenses.map((d) => [d.projet_id, d]));
  const elementsProjet = (programme?.unites ?? [])
    .flatMap((u) => u.elements)
    .filter((e) => e.est_projet);

  return (
    <div className="space-y-4">
      <Erreur message={erreur} />

      {suivi && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi valeur={suivi.effectif} libelle="inscrits" />
          <Kpi valeur={suivi.avec_sujet_approuve} libelle="sujets approuvés" />
          <Kpi valeur={suivi.avec_directeur} libelle="avec directeur" />
          <Kpi valeur={suivi.avec_rapporteur} libelle="avec rapporteur" />
          <Kpi valeur={suivi.avec_fichier} libelle="mémoires déposés" />
          <Kpi valeur={suivi.commission_peut_travailler} libelle="dossiers prêts" />
        </div>
      )}

      <Carte
        titre="Dossiers"
        sousTitre="« Prêt » se calcule : sujet approuvé, directeur, rapporteur, mémoire — et plagiat si l'établissement l'exige."
      >
        {projets.length === 0 ? (
          <Vide message="Aucun projet dans cette promotion. Ouvrez le dossier d'un inscrit depuis sa fiche pour le créer." />
        ) : (
          <div className="divide-y divide-hairline">
            {projets.map((p) => {
              const defense = parProjet[p.id];
              return (
                <Fragment key={p.id}>
                  <div
                    onClick={() => setOuvert(ouvert === p.id ? null : p.id)}
                    className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-low"
                  >
                    <span className="w-[9rem] flex-none font-mono text-label-md text-outline">
                      {p.matricule}
                    </span>
                    <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                      {p.nom_complet}
                      <span className="ml-2 text-label-md text-outline">
                        {p.titre ?? "sujet non rédigé"}
                      </span>
                    </span>
                    <Pastille ton={TON_SUJET[p.titre_statut] ?? "neutre"}>
                      {p.titre_statut_libelle}
                    </Pastille>
                    {p.avancement.commission_peut_travailler ? (
                      <Pastille ton="ok">Prêt à soutenir</Pastille>
                    ) : (
                      <Pastille ton="attente" titre={p.avancement.manquants.join(" · ")}>
                        {p.avancement.manquants.length} point(s) manquant(s)
                      </Pastille>
                    )}
                    {defense && (
                      <Pastille ton={TON_DEFENSE[defense.statut] ?? "neutre"}>
                        Défense {defense.statut_libelle}
                        {defense.note_finale !== null && ` — ${defense.note_finale}/20`}
                      </Pastille>
                    )}
                  </div>

                  {ouvert === p.id && (
                    <div className="space-y-3 bg-surface-container-low px-4 py-3">
                      {/* Ce qui manque est NOMMÉ : un drapeau rouge sans raison
                          oblige à chercher. */}
                      {p.avancement.manquants.length > 0 && (
                        <Bilan
                          titre="Ce qui empêche la commission de travailler"
                          ecarts={p.avancement.manquants}
                          ton="alerte"
                        />
                      )}

                      <div className="grid gap-1 text-label-md text-on-surface-variant">
                        <span>Directeur : {p.directeur_nom || "non attribué"}</span>
                        <span>Rapporteur : {p.rapporteur_nom || "non attribué"}</span>
                        <span>
                          Mémoire : {p.fichier_nom ?? "non déposé"}
                          {p.plagiat_taux !== null &&
                            ` · plagiat ${p.plagiat_taux}% ${
                              p.plagiat_valide ? "(dans le seuil)" : "(hors seuil)"
                            }`}
                        </span>
                        {p.titre_motif && <span>Décision : {p.titre_motif}</span>}
                      </div>

                      {peutGerer && (
                        <div className="flex flex-wrap items-end gap-2">
                          <select
                            aria-label="Directeur"
                            className={CHAMP}
                            defaultValue={p.directeur_id ?? ""}
                            onChange={(e) =>
                              agir(
                                () =>
                                  api.attribuerEncadrement(p.id, {
                                    directeur_id: e.target.value ? Number(e.target.value) : null,
                                    rapporteur_id: p.rapporteur_id,
                                  }),
                                "Directeur attribué."
                              )
                            }
                          >
                            <option value="">Directeur…</option>
                            {enseignants.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.nom_complet}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label="Rapporteur"
                            className={CHAMP}
                            defaultValue={p.rapporteur_id ?? ""}
                            onChange={(e) =>
                              agir(
                                () =>
                                  api.attribuerEncadrement(p.id, {
                                    directeur_id: p.directeur_id,
                                    rapporteur_id: e.target.value ? Number(e.target.value) : null,
                                  }),
                                "Rapporteur attribué."
                              )
                            }
                          >
                            <option value="">Rapporteur…</option>
                            {enseignants.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.nom_complet}
                              </option>
                            ))}
                          </select>
                          {p.titre_statut === "SOUMIS" && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  agir(
                                    () => api.deciderSujet(p.id, true, "Sujet retenu"),
                                    "Sujet approuvé."
                                  )
                                }
                                className={BOUTON}
                              >
                                Approuver le sujet
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  const motif = window.prompt(
                                    "Motif du refus ? Sans un mot, l'étudiant ne sait pas quoi corriger."
                                  );
                                  if (!motif) return;
                                  void agir(
                                    () => api.deciderSujet(p.id, false, motif),
                                    "Sujet refusé."
                                  );
                                }}
                                className={BOUTON_PLAT}
                              >
                                Refuser
                              </button>
                            </>
                          )}
                          {p.titre_statut === "APPROUVE" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                const motif = window.prompt(
                                  "Motif de la réouverture ? Le directeur s'était engagé sur ce sujet."
                                );
                                if (!motif) return;
                                void agir(
                                  () => api.rouvrirSujet(p.id, motif),
                                  "Sujet rouvert."
                                );
                              }}
                              className={BOUTON_PLAT}
                            >
                              Rouvrir le sujet
                            </button>
                          )}
                        </div>
                      )}

                      {peutOrganiser && !defense && (
                        <div className="flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
                          <input
                            aria-label="Date de la défense"
                            type="date"
                            className={CHAMP}
                            id={`date-${p.id}`}
                          />
                          <select aria-label="Élément lié" className={CHAMP} id={`elem-${p.id}`}>
                            <option value="">Sans report de note</option>
                            {elementsProjet.map((e) => (
                              <option key={e.id} value={e.id}>
                                Reporter sur {e.intitule}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const date = (
                                document.getElementById(`date-${p.id}`) as HTMLInputElement | null
                              )?.value;
                              const elem = (
                                document.getElementById(`elem-${p.id}`) as HTMLSelectElement | null
                              )?.value;
                              if (!date) {
                                setErreur("Choisissez la date de la défense.");
                                return;
                              }
                              void agir(
                                () =>
                                  api.planifierDefense({
                                    projet_id: p.id,
                                    date,
                                    element_id: elem ? Number(elem) : null,
                                    forcer: !p.avancement.commission_peut_travailler,
                                  }),
                                "Défense planifiée."
                              );
                            }}
                            className={BOUTON}
                          >
                            {p.avancement.commission_peut_travailler
                              ? "Planifier la défense"
                              : "Planifier en forçant"}
                          </button>
                        </div>
                      )}

                      {defense && (
                        <DefenseBloc
                          defense={defense}
                          enseignants={enseignants}
                          peutOrganiser={peutOrganiser}
                          busy={busy}
                          agir={agir}
                        />
                      )}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
      </Carte>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function DefenseBloc({
  defense,
  enseignants,
  peutOrganiser,
  busy,
  agir,
}: {
  defense: Defense;
  enseignants: Enseignant[];
  peutOrganiser: boolean;
  busy: boolean;
  agir: (action: () => Promise<unknown>, message: string) => Promise<boolean>;
}) {
  const [directeur, setDirecteur] = useState("");
  const [lecteur, setLecteur] = useState("");

  return (
    <div className="space-y-2 border-t border-hairline pt-3">
      <p className="text-body-sm font-medium text-on-surface">
        Défense du {new Date(defense.date).toLocaleDateString("fr-FR")} —{" "}
        {defense.statut_libelle}
        {defense.note_finale !== null && ` · ${defense.note_finale}/20`}
      </p>

      {defense.jures.length > 0 && (
        <div className="space-y-0.5">
          {defense.jures.map((j) => (
            <p key={j.id} className="text-label-md text-on-surface-variant">
              {j.role_libelle} : {j.nom_complet}
              {/* La délégation garde QUI est remplacé : sinon on ne saurait plus
                  qu'un directeur ne s'est pas présenté. */}
              {j.remplace_nom && ` (remplace ${j.remplace_nom} — ${j.remplace_motif})`}
              {j.note !== null && ` · ${j.note}/20`}
              {!j.a_termine && " · n'a pas fini"}
            </p>
          ))}
        </div>
      )}

      {defense.incomplets.length > 0 && (
        <Bilan titre="Jurés qui n'ont pas fini" ecarts={defense.incomplets} ton="alerte" />
      )}

      {peutOrganiser && (
        <div className="flex flex-wrap items-end gap-2">
          {defense.jures.length < 2 && (
            <>
              <select
                aria-label="Directeur du jury"
                className={CHAMP}
                value={directeur}
                onChange={(e) => setDirecteur(e.target.value)}
              >
                <option value="">Directeur…</option>
                {enseignants.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nom_complet}
                  </option>
                ))}
              </select>
              <select
                aria-label="Premier lecteur"
                className={CHAMP}
                value={lecteur}
                onChange={(e) => setLecteur(e.target.value)}
              >
                <option value="">Premier lecteur…</option>
                {enseignants.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nom_complet}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !directeur || !lecteur}
                onClick={() =>
                  agir(
                    () =>
                      api.constituerJury(defense.id, [
                        { enseignant_id: Number(directeur), role: "DIRECTEUR" },
                        { enseignant_id: Number(lecteur), role: "PREMIER_LECTEUR" },
                      ]),
                    "Jury constitué."
                  )
                }
                className={BOUTON}
              >
                Constituer le jury
              </button>
            </>
          )}
          {defense.statut === "PLANIFIEE" && defense.jures.length >= 2 && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                agir(() => api.ouvrirCotationDefense(defense.id), "Cotation ouverte.")
              }
              className={BOUTON}
            >
              Ouvrir la cotation
            </button>
          )}
          {defense.statut === "COTATION_OUVERTE" && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                agir(() => api.cloreCotationDefense(defense.id), "Cotation close.")
              }
              className={BOUTON_PLAT}
            >
              Clore la cotation
            </button>
          )}
          {defense.statut === "COTEE" && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                agir(
                  () => api.proclamerDefense(defense.id),
                  "Résultat proclamé — la note est reportée sur l'élément lié."
                )
              }
              className={BOUTON}
            >
              Proclamer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
