"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { api, type Paiement, type RapportFrais, type TypeFrais } from "@/app/lib/api";
import {
  BOUTON,
  BOUTON_PLAT,
  CHAMP,
  Carte,
  Erreur,
  Kpi,
  Pastille,
  Vide,
} from "@/components/Bloc";
import { usePromotion } from "../promotion-context";

/** Les frais d'une promotion : qui est en ordre, et de combien.
 *
 *  **Rien ici ne masque personne.** L'existant relevé peut faire disparaître un
 *  étudiant d'une grille parce qu'il n'a pas payé ; cet écran rend TOUTES les
 *  situations, et celle qui n'est pas en ordre nomme ce qui manque.
 */
export default function FraisPage() {
  const { promotionId, etablissementId } = usePromotion();
  const { can } = usePermissions();
  const peutConstater = can("academique.frais.constater");
  const peutGerer = can("academique.frais.gerer");

  const [rapport, setRapport] = useState<RapportFrais | null>(null);
  const [types, setTypes] = useState<TypeFrais[]>([]);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState("");
  const [periode, setPeriode] = useState("");
  const [montant, setMontant] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const charger = useCallback(async () => {
    try {
      setRapport(await api.rapportFrais(promotionId));
      if (etablissementId) setTypes(await api.typesFrais(etablissementId));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [promotionId, etablissementId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const ouvrir = useCallback(async (inscription: number) => {
    if (ouvert === inscription) {
      setOuvert(null);
      return;
    }
    setOuvert(inscription);
    setPaiements(await api.paiements(inscription).catch(() => []));
  }, [ouvert]);

  async function agir(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setErreur(null);
    try {
      await action();
      setToast(message);
      await charger();
      if (ouvert) setPaiements(await api.paiements(ouvert).catch(() => []));
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const typeChoisi = types.find((t) => String(t.id) === type);

  return (
    <div className="space-y-4">
      <Erreur message={erreur} />

      {rapport && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi valeur={rapport.effectif} libelle="inscrits" />
          <Kpi
            valeur={`${rapport.en_ordre} · ${rapport.pourcentage_en_ordre}%`}
            libelle="en ordre"
          />
          <Kpi valeur={rapport.total_paye} libelle="encaissé (constaté)" />
          <Kpi valeur={rapport.total_reste} libelle="reste à payer" />
        </div>
      )}

      <Carte
        titre="Situation par étudiant"
        sousTitre="« En ordre » n'est pas « soldé » : un acompte suffit quand le seuil du frais le dit."
      >
        {rapport === null ? (
          <Vide message="Chargement…" />
        ) : rapport.situations.length === 0 ? (
          <Vide message="Personne n'est inscrit dans cette promotion." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse">
              <thead>
                <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                  <th className="px-4 py-2 text-left font-medium">Matricule</th>
                  <th className="px-2 py-2 text-left font-medium">Nom</th>
                  <th className="w-[6rem] px-2 py-2 text-right font-medium">Dû</th>
                  <th className="w-[6rem] px-2 py-2 text-right font-medium">Payé</th>
                  <th className="w-[6rem] px-2 py-2 text-right font-medium">Reste</th>
                  <th className="w-[16rem] px-4 py-2 text-left font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {rapport.situations.map((s) => (
                  <Fragment key={s.inscription_id}>
                    <tr
                      onClick={() => void ouvrir(s.inscription_id)}
                      className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-container-low"
                    >
                      <td className="px-4 py-1.5 font-mono text-label-md text-outline">
                        {s.matricule}
                      </td>
                      <td className="px-2 py-1.5 text-body-sm text-on-surface">{s.nom_complet}</td>
                      <td className="px-2 py-1.5 text-right text-body-sm tabular-nums text-on-surface-variant">
                        {s.total_du}
                      </td>
                      <td className="px-2 py-1.5 text-right text-body-sm tabular-nums text-on-surface">
                        {s.total_paye}
                      </td>
                      <td className="px-2 py-1.5 text-right text-body-sm tabular-nums text-on-surface">
                        {s.total_reste}
                      </td>
                      <td className="px-4 py-1.5">
                        {s.en_ordre ? (
                          <Pastille ton="ok">En ordre</Pastille>
                        ) : (
                          // Ce qui manque est NOMMÉ : « pas en ordre » sans dire
                          // quoi oblige à chercher.
                          <Pastille ton="alerte" titre={s.manquants.join(" · ")}>
                            {s.manquants.join(" · ")}
                          </Pastille>
                        )}
                      </td>
                    </tr>

                    {ouvert === s.inscription_id && (
                      <tr className="bg-surface-container-low">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-1">
                            {s.lignes.map((l) => (
                              <div
                                key={`${l.type_frais_id}-${l.periode ?? 0}`}
                                className="flex flex-wrap items-center gap-2 text-label-md"
                              >
                                <span className="min-w-[14rem] text-on-surface">
                                  {l.libelle}
                                  {l.periode ? ` — période ${l.periode}` : ""}
                                </span>
                                <span className="tabular-nums text-on-surface-variant">
                                  dû {l.du} · payé {l.paye}
                                  {l.exonere > 0 && ` · exonéré ${l.exonere}`} · reste {l.reste}{" "}
                                  {l.devise}
                                </span>
                                <Pastille ton={l.en_ordre ? "ok" : "attente"}>
                                  {l.en_ordre ? "en ordre" : `seuil ${l.pourcentage_minimum}%`}
                                </Pastille>
                              </div>
                            ))}
                          </div>

                          {/* Les constats, ANNULÉS COMPRIS : cacher une
                              annulation reviendrait à effacer le constat. */}
                          {paiements.length > 0 && (
                            <div className="mt-3 space-y-1 border-t border-hairline pt-2">
                              {paiements.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-wrap items-center gap-2 text-label-md"
                                >
                                  <span
                                    className={
                                      p.annule
                                        ? "text-outline line-through"
                                        : "text-on-surface"
                                    }
                                  >
                                    {p.paye_le} · {p.type_libelle}
                                    {p.periode ? ` (P${p.periode})` : ""} · {p.montant}
                                    {p.reference ? ` · ${p.reference}` : ""}
                                  </span>
                                  {p.annule ? (
                                    <Pastille ton="alerte" titre={p.annule_motif ?? undefined}>
                                      annulé — {p.annule_motif}
                                    </Pastille>
                                  ) : (
                                    peutGerer && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => {
                                          const motif = window.prompt(
                                            "Motif de l'annulation ? Le reçu de l'étudiant, lui, existe toujours."
                                          );
                                          if (!motif) return;
                                          void agir(
                                            () => api.annulerPaiement(p.id, motif),
                                            "Paiement annulé — la ligne reste lisible."
                                          );
                                        }}
                                        className="text-label-md text-on-surface-variant hover:text-error"
                                      >
                                        Annuler
                                      </button>
                                    )
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {peutConstater && (
                            <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-hairline pt-3">
                              <select
                                aria-label="Type de frais"
                                className={CHAMP}
                                value={type}
                                onChange={(e) => {
                                  setType(e.target.value);
                                  setPeriode("");
                                }}
                              >
                                <option value="">Frais…</option>
                                {types.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.libelle}
                                  </option>
                                ))}
                              </select>
                              {/* La période n'a de sens que pour un frais qui se
                                  doit par période — le serveur refuse l'inverse,
                                  l'écran ne le propose donc pas. */}
                              {typeChoisi?.portee === "PERIODE" && (
                                <select
                                  aria-label="Période"
                                  className={CHAMP}
                                  value={periode}
                                  onChange={(e) => setPeriode(e.target.value)}
                                >
                                  <option value="">Période…</option>
                                  {[1, 2, 3, 4, 5, 6].map((p) => (
                                    <option key={p} value={p}>
                                      Période {p}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                aria-label="Montant"
                                type="number"
                                min={0}
                                step="0.01"
                                className={`${CHAMP} w-[8rem]`}
                                placeholder="Montant"
                                value={montant}
                                onChange={(e) => setMontant(e.target.value)}
                              />
                              <input
                                aria-label="Date du paiement"
                                type="date"
                                className={CHAMP}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                              />
                              <input
                                aria-label="Référence"
                                className={`${CHAMP} w-[10rem]`}
                                placeholder="Bordereau"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                              />
                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  !type ||
                                  !montant ||
                                  (typeChoisi?.portee === "PERIODE" && !periode)
                                }
                                onClick={async () => {
                                  const ok = await agir(
                                    () =>
                                      api.constaterPaiement({
                                        inscription_id: s.inscription_id,
                                        type_frais_id: Number(type),
                                        periode: periode ? Number(periode) : null,
                                        montant: Number(montant),
                                        paye_le: date,
                                        reference: reference || null,
                                      }),
                                    "Paiement constaté."
                                  );
                                  if (ok) {
                                    setMontant("");
                                    setReference("");
                                  }
                                }}
                                className={BOUTON}
                              >
                                Constater
                              </button>
                              {peutGerer && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    const motif = window.prompt(
                                      "Motif de l'exonération ? Sans raison, elle ne se distingue pas d'un oubli de saisie."
                                    );
                                    if (!motif) return;
                                    void agir(
                                      () =>
                                        api.exonerer({
                                          inscription_id: s.inscription_id,
                                          type_frais_id: type ? Number(type) : null,
                                          pourcentage: 100,
                                          motif,
                                        }),
                                      "Exonération accordée."
                                    );
                                  }}
                                  className={BOUTON_PLAT}
                                >
                                  Exonérer
                                </button>
                              )}
                            </div>
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
