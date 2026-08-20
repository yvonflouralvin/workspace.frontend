"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { api, type Grille, type Palmares } from "@/app/lib/api";
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

const TON_DECISION: Record<string, string> = {
  ADMIS: "ok",
  ADMIS_A_PROGRESSER: "info",
  AJOURNE: "attente",
  DEFICIENT: "alerte",
};

/** La grille du jury et le palmarès, sur le même écran.
 *
 *  Ce sont deux lectures du même travail, et les séparer obligerait à naviguer
 *  entre elles pendant une séance : la grille se recalcule à chaque cote, le
 *  palmarès est ce qui a été arrêté. L'écran dit laquelle il montre.
 */
export default function DeliberationPage() {
  const { promotionId, session } = usePromotion();
  const { can } = usePermissions();
  const peutConduire = can("academique.deliberation.conduire");

  const [periode, setPeriode] = useState(0);
  const [grille, setGrille] = useState<Grille | null>(null);
  const [palmares, setPalmares] = useState<Palmares | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aCloturer, setACloturer] = useState<{ forcer: boolean; detail?: string } | null>(null);
  const [pv, setPv] = useState("");

  const charger = useCallback(async () => {
    try {
      setGrille(await api.grille(promotionId, session, periode));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setGrille(null);
    }
    // Le palmarès n'existe qu'après clôture : son absence n'est pas une erreur.
    try {
      setPalmares(await api.palmares(promotionId, session, periode));
    } catch {
      setPalmares(null);
    }
  }, [promotionId, session, periode]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function cloturer(forcer: boolean) {
    setBusy(true);
    setErreur(null);
    try {
      await api.cloturerDeliberation(promotionId, {
        session,
        periode,
        proces_verbal: pv || null,
        forcer,
      });
      setToast("Délibération close.");
      setACloturer(null);
      await charger();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Clôture impossible.";
      // Le refus du serveur NOMME les étudiants incomplets : on le remonte tel
      // quel dans la confirmation, il porte l'information.
      if (message.includes("cotes manquantes")) setACloturer({ forcer: true, detail: message });
      else setErreur(message);
    } finally {
      setBusy(false);
    }
  }

  async function rouvrir() {
    if (!grille?.deliberation_id) return;
    setBusy(true);
    try {
      await api.rouvrirDeliberation(grille.deliberation_id);
      setToast("Délibération rouverte — les décisions figées sont effacées.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Réouverture impossible.");
    } finally {
      setBusy(false);
    }
  }

  const close = Boolean(grille?.close_le);

  return (
    <div className="space-y-4">
      <Erreur message={erreur} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          Portée
          <select
            aria-label="Portée de la délibération"
            className={CHAMP}
            value={periode}
            onChange={(e) => setPeriode(Number(e.target.value))}
          >
            <option value={0}>Année entière</option>
            {[1, 2, 3, 4, 5, 6].map((p) => (
              <option key={p} value={p}>
                Période {p}
              </option>
            ))}
          </select>
        </label>
        {grille && (
          <>
            <Pastille ton="neutre" titre="Les seuils en vigueur">
              seuil {grille.seuil_validation}/20
              {grille.compensation_ue ? " · compensation UE" : " · sans compensation"}
            </Pastille>
            {close ? (
              <Pastille ton="ok">Close le {grille.close_le?.slice(0, 10)}</Pastille>
            ) : grille.etudiants_incomplets ? (
              <Pastille ton="alerte">
                {grille.etudiants_incomplets} dossier(s) incomplet(s)
              </Pastille>
            ) : (
              <Pastille ton="attente">Prête à clôturer</Pastille>
            )}
          </>
        )}
      </div>

      {/* Le palmarès FIGÉ, quand il existe. Il ne bouge plus, même si une cote
          est corrigée ensuite — c'est toute la différence avec la grille. */}
      {palmares && (
        <Carte
          titre="Palmarès proclamé"
          sousTitre={`${palmares.effectif} étudiants · arrêté le ${palmares.close_le.slice(0, 10)}`}
        >
          <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {palmares.par_decision.map((d) => (
              <Kpi
                key={d.cle}
                valeur={`${d.effectif} · ${d.pourcentage}%`}
                libelle={d.libelle}
              />
            ))}
          </div>
          {palmares.par_mention.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-hairline px-4 py-3">
              {palmares.par_mention.map((m) => (
                <Pastille key={m.cle} ton="neutre">
                  {m.libelle} — {m.effectif}
                </Pastille>
              ))}
            </div>
          )}
        </Carte>
      )}

      <Carte
        titre={close ? "Grille (recalculée en direct)" : "Grille du jury"}
        sousTitre={
          close
            ? "Les décisions arrêtées sont dans le palmarès ci-dessus ; cette grille suit les cotes actuelles."
            : "Elle se recalcule à chaque cote saisie."
        }
        action={
          peutConduire && (
            <div className="flex gap-2">
              {close ? (
                <button type="button" disabled={busy} onClick={rouvrir} className={BOUTON_PLAT}>
                  Rouvrir la délibération
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !grille?.lignes.length}
                  onClick={() => setACloturer({ forcer: false })}
                  className={BOUTON}
                >
                  Clôturer
                </button>
              )}
            </div>
          )
        }
      >
        {grille === null ? (
          <Vide message="Chargement…" />
        ) : grille.lignes.length === 0 ? (
          <Vide message="Personne n'est inscrit dans cette promotion." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse">
              <thead>
                <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                  <th className="px-4 py-2 text-left font-medium">Matricule</th>
                  <th className="px-2 py-2 text-left font-medium">Nom</th>
                  <th className="w-[7rem] px-2 py-2 text-right font-medium">Crédits</th>
                  <th className="w-[6rem] px-2 py-2 text-right font-medium">Moyenne</th>
                  <th className="w-[9rem] px-2 py-2 text-left font-medium">Mention</th>
                  <th className="w-[11rem] px-4 py-2 text-left font-medium">Décision</th>
                </tr>
              </thead>
              <tbody>
                {grille.lignes.map((l) => (
                  // Le fragment porte la clé : `<>` n'en accepte pas, et React
                  // avertirait sur chaque ligne de la grille.
                  <Fragment key={l.inscription_id}>
                    <tr
                      onClick={() =>
                        setDetail(detail === l.inscription_id ? null : l.inscription_id)
                      }
                      className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-1.5 font-mono text-label-md text-outline">
                        {l.matricule}
                      </td>
                      <td className="px-2 py-1.5 text-body-sm text-on-surface">{l.nom_complet}</td>
                      <td className="px-2 py-1.5 text-right text-body-sm tabular-nums text-on-surface">
                        {l.credits_acquis}/{l.credits_totaux}
                      </td>
                      <td className="px-2 py-1.5 text-right text-body-sm tabular-nums text-on-surface">
                        {l.moyenne ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-label-md text-on-surface-variant">
                        {l.mention ?? "—"}
                      </td>
                      <td className="px-4 py-1.5">
                        <Pastille ton={TON_DECISION[l.decision] ?? "neutre"} titre={l.decision_libelle}>
                          {l.decision_abrege}
                        </Pastille>
                      </td>
                    </tr>
                    {detail === l.inscription_id && (
                      <tr className="bg-surface-container-low">
                        <td colSpan={6} className="px-4 py-3">
                          {/* Ce qui BLOQUE la délibération de cet étudiant est
                              nommé : sinon il faut ouvrir chaque fiche. */}
                          {l.manquants.length > 0 && (
                            <Bilan
                              titre={`${l.manquants.length} cote(s) manquante(s)`}
                              ecarts={l.manquants}
                              ton="alerte"
                            />
                          )}
                          {l.elements_a_reprendre.length > 0 && (
                            <p className="mt-2 text-label-md text-on-surface-variant">
                              À reprendre : {l.elements_a_reprendre.join(", ")}
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            {l.unites.map((u) => (
                              <div key={u.unite_id} className="text-label-md">
                                <span className="font-mono text-outline">{u.code}</span>{" "}
                                <span className="text-on-surface">{u.intitule}</span>{" "}
                                <span className="text-on-surface-variant">
                                  — moyenne {u.moyenne ?? "—"}, {u.credits_acquis}/{u.credits} crédits
                                </span>
                                {u.elements.map((e) => (
                                  <span
                                    key={e.element_id}
                                    className={`ml-2 ${
                                      e.manquante
                                        ? "text-error"
                                        : e.valide
                                          ? "text-secondary"
                                          : "text-on-surface-variant"
                                    }`}
                                  >
                                    {e.intitule} {e.non_delibere ? "ND" : (e.total ?? "—")}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
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

      {aCloturer && (
        <ConfirmDialog
          title={aCloturer.forcer ? "Clôturer malgré les cotes manquantes ?" : "Clôturer la délibération ?"}
          message={
            <div className="space-y-2">
              {aCloturer.detail && <p>{aCloturer.detail}</p>}
              {aCloturer.forcer && (
                <p className="font-medium text-on-surface">
                  Les étudiants concernés resteront « déficients » : forcer ne les transforme pas en
                  ajournés.
                </p>
              )}
              <textarea
                aria-label="Procès-verbal"
                className="min-h-[5rem] w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                placeholder="Procès-verbal de la séance (facultatif)"
                value={pv}
                onChange={(e) => setPv(e.target.value)}
              />
            </div>
          }
          confirmLabel={aCloturer.forcer ? "Clôturer en forçant" : "Clôturer"}
          busy={busy}
          onConfirm={() => cloturer(aCloturer.forcer)}
          onCancel={() => setACloturer(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
