"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { api, type Recours, type TableauRecours } from "@/app/lib/api";
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

const TON: Record<string, string> = { DEPOSE: "attente", ACCEPTE: "ok", REFUSE: "alerte" };

/** Les recours d'une promotion : le tableau par cours, puis les dossiers.
 *
 *  Les **deux vannes** s'affichent séparément — dépôt et traitement. N'en
 *  montrer qu'une ferait croire qu'on ne peut pas traiter parce que le dépôt est
 *  fermé, alors que c'est justement l'ordre normal des choses.
 */
export default function RecoursPage() {
  const { promotionId, session } = usePromotion();
  const { can } = usePermissions();
  const peutTraiter = can("academique.recours.traiter");
  const peutBasculer = can("academique.vannes.manage");

  const [tableau, setTableau] = useState<TableauRecours | null>(null);
  const [dossiers, setDossiers] = useState<Recours[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [bilan, setBilan] = useState<{ titre: string; ecarts: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enCours, setEnCours] = useState<number | null>(null);
  const [justification, setJustification] = useState("");
  const [note, setNote] = useState("");

  const charger = useCallback(async () => {
    try {
      setTableau(await api.tableauRecours(promotionId, session));
      setDossiers(await api.recours(promotionId, session));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [promotionId, session]);

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

  async function decider(id: number, accepte: boolean) {
    const ok = await agir(
      () =>
        api.deciderRecours(id, {
          accepte,
          justification,
          nouvelle_note: accepte && note !== "" ? Number(note) : null,
        }),
      accepte ? "Recours accepté." : "Recours refusé."
    );
    if (ok) {
      setEnCours(null);
      setJustification("");
      setNote("");
    }
  }

  const enAttente = dossiers.filter((d) => d.statut === "DEPOSE");

  return (
    <div className="space-y-4">
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
            <Kpi valeur={tableau.total} libelle="recours déposés" />
            <Kpi valeur={tableau.en_attente} libelle="en attente du jury" />
            {/* Deux vannes, deux pastilles. */}
            <div className="rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2.5">
              <Pastille ton={tableau.depot_ouvert ? "ok" : "neutre"}>
                Dépôt {tableau.depot_ouvert ? "ouvert" : "fermé"}
              </Pastille>
              <p className="mt-1 text-label-md text-outline">les étudiants déposent</p>
            </div>
            <div className="rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2.5">
              <Pastille ton={tableau.traitement_ouvert ? "ok" : "neutre"}>
                Traitement {tableau.traitement_ouvert ? "ouvert" : "fermé"}
              </Pastille>
              <p className="mt-1 text-label-md text-outline">le jury tranche</p>
            </div>
          </div>

          {peutBasculer && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  agir(
                    () =>
                      api.basculerVanne(
                        promotionId,
                        "recours_etudiants",
                        !tableau.depot_ouvert
                      ),
                    tableau.depot_ouvert ? "Dépôt fermé." : "Dépôt ouvert."
                  )
                }
                className={BOUTON_PLAT}
              >
                {tableau.depot_ouvert ? "Fermer le dépôt" : "Ouvrir le dépôt"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  agir(
                    () => api.basculerVanne(promotionId, "recours", !tableau.traitement_ouvert),
                    tableau.traitement_ouvert ? "Traitement fermé." : "Traitement ouvert."
                  )
                }
                className={BOUTON_PLAT}
              >
                {tableau.traitement_ouvert ? "Fermer le traitement" : "Ouvrir le traitement"}
              </button>
            </div>
          )}
        </>
      )}

      {peutTraiter && enAttente.length > 0 && (
        <Carte
          titre="Décision de masse"
          sousTitre="Aucune note n'est attribuée : trancher cent dossiers d'un coup est un geste d'administration, pas une correction."
        >
          <div className="flex flex-wrap items-center gap-2 p-4">
            <input
              aria-label="Justification de la décision de masse"
              className={`${CHAMP} min-w-[18rem] flex-1`}
              placeholder="Justification (obligatoire)"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !justification.trim()}
              onClick={async () => {
                const r = await api
                  .deciderRecoursEnMasse(promotionId, {
                    session,
                    accepte: true,
                    justification,
                    seulement_nd: true,
                  })
                  .catch((e) => {
                    setErreur(e instanceof Error ? e.message : "Action impossible.");
                    return null;
                  });
                if (r) {
                  setBilan({ titre: `${r.traites} recours ND accepté(s)`, ecarts: r.ignores });
                  await charger();
                }
              }}
              className={BOUTON_PLAT}
            >
              Accepter les recours ND
            </button>
            <button
              type="button"
              disabled={busy || !justification.trim()}
              onClick={async () => {
                const r = await api
                  .deciderRecoursEnMasse(promotionId, {
                    session,
                    accepte: false,
                    justification,
                  })
                  .catch((e) => {
                    setErreur(e instanceof Error ? e.message : "Action impossible.");
                    return null;
                  });
                if (r) {
                  setBilan({ titre: `${r.traites} recours refusé(s)`, ecarts: r.ignores });
                  await charger();
                }
              }}
              className={BOUTON_PLAT}
            >
              Refuser tous
            </button>
          </div>
        </Carte>
      )}

      <Carte titre="Dossiers" sousTitre={`Session ${tableau?.session_libelle ?? ""}`}>
        {dossiers.length === 0 ? (
          <Vide message="Aucun recours déposé pour cette session." />
        ) : (
          <div className="divide-y divide-hairline">
            {dossiers.map((d) => (
              <div key={d.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-[9rem] flex-none font-mono text-label-md text-outline">
                    {d.matricule}
                  </span>
                  <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                    {d.nom_complet}
                    <span className="ml-2 text-label-md text-outline">{d.element_intitule}</span>
                  </span>
                  {/* L'instantané du dépôt et la cote d'après, côte à côte : sans
                      le premier, on ne sait plus d'où l'on partait. */}
                  <span className="flex-none text-label-md tabular-nums text-on-surface-variant">
                    {d.cote_avant_nd ? "ND" : (d.cote_avant ?? "—")}
                    {d.cote_apres !== null && ` → ${d.cote_apres}`}
                  </span>
                  <Pastille ton={TON[d.statut] ?? "neutre"} titre={d.statut_libelle}>
                    {d.statut_libelle}
                  </Pastille>
                  {peutTraiter && d.statut === "DEPOSE" && (
                    <button
                      type="button"
                      onClick={() => setEnCours(enCours === d.id ? null : d.id)}
                      className="flex-none text-label-md font-semibold text-primary hover:underline"
                    >
                      Trancher
                    </button>
                  )}
                </div>
                <p className="mt-1 text-label-md text-on-surface-variant">Motif : {d.motif}</p>
                {d.justification && (
                  <p className="mt-0.5 text-label-md text-on-surface-variant">
                    Jury : {d.justification}
                  </p>
                )}

                {enCours === d.id && (
                  <div className="mt-2 space-y-2 rounded-xl bg-surface-container-low p-3">
                    <input
                      aria-label="Justification"
                      className={`${CHAMP} w-full`}
                      placeholder="Justification de la décision (obligatoire)"
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        aria-label="Nouvelle note sur 20"
                        type="number"
                        min={0}
                        max={20}
                        step="0.25"
                        className={`${CHAMP} w-[10rem]`}
                        placeholder="Note /20"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <span className="text-label-md text-outline">
                        Le jury arrête un total sur 20 — il ne ventile pas entre travaux et examen.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !justification.trim()}
                        onClick={() => decider(d.id, true)}
                        className={BOUTON}
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        disabled={busy || !justification.trim()}
                        onClick={() => decider(d.id, false)}
                        className={BOUTON_PLAT}
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Carte>

      {tableau && tableau.par_cours.length > 0 && (
        <Carte titre="Par cours">
          <div className="divide-y divide-hairline">
            {tableau.par_cours.map((c) => (
              <div key={c.element_id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                  {c.element_intitule}
                  <span className="ml-2 font-mono text-label-md text-outline">{c.code_ue}</span>
                </span>
                <span className="flex-none text-label-md text-on-surface-variant">
                  {c.titulaire_nom || "titulaire non attribué"}
                </span>
                {c.en_attente > 0 && <Pastille ton="attente">{c.en_attente} en attente</Pastille>}
                {c.acceptes > 0 && <Pastille ton="ok">{c.acceptes} acceptés</Pastille>}
                {c.refuses > 0 && <Pastille ton="alerte">{c.refuses} refusés</Pastille>}
              </div>
            ))}
          </div>
        </Carte>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
