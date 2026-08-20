"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AutoAwesomeMotionOutlined,
  ContentCopyOutlined,
  DeleteOutlineOutlined,
  DescriptionOutlined,
  HowToRegOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { api, type Planning, type Programme } from "@/app/lib/api";
import { BOUTON, BOUTON_PLAT, Bilan, CHAMP, Carte, Erreur, Pastille, Vide } from "@/components/Bloc";
import { usePromotion } from "../promotion-context";

/** Le planning des épreuves d'une session.
 *
 *  Il montre AUSSI ce qu'il ne couvre pas : les éléments sans épreuve sont
 *  nommés. Un planning qui n'afficherait que ce qu'il contient laisserait croire
 *  qu'il est complet, et l'oubli se découvrirait le jour de la session.
 */
export default function ExamensPage() {
  const { promotionId, session, sessions } = usePromotion();
  const { can } = usePermissions();
  const peutGerer = can("academique.examens.manage");

  const [planning, setPlanning] = useState<Planning | null>(null);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [bilan, setBilan] = useState<{ titre: string; ecarts: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ouvertAjout, setOuvertAjout] = useState(false);

  const [element, setElement] = useState("");
  const [date, setDate] = useState("");
  const [debut, setDebut] = useState("08:30");
  const [fin, setFin] = useState("11:30");
  const [oral, setOral] = useState(false);
  const [cible, setCible] = useState("RATTRAPAGE");

  const charger = useCallback(async () => {
    try {
      setPlanning(await api.planningExamens(promotionId, session));
      setProgramme(await api.programme(promotionId));
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

  const elements = (programme?.unites ?? []).flatMap((u) =>
    u.elements.map((e) => ({ ...e, code_ue: u.code, periode: u.periode }))
  );

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

      {/* Ce que le planning NE couvre PAS. En tête, parce que c'est ce qui
          manque qui compte à la veille d'une session. */}
      {planning && planning.elements_sans_examen.length > 0 && (
        <Bilan
          titre={`${planning.elements_sans_examen.length} élément(s) sans épreuve programmée`}
          ecarts={planning.elements_sans_examen}
          ton="alerte"
        />
      )}

      {peutGerer && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOuvertAjout((o) => !o)}
            className={BOUTON}
          >
            Programmer une épreuve
          </button>
          <button
            type="button"
            disabled={busy || !date}
            title={date ? undefined : "Choisissez d'abord une date et un créneau"}
            onClick={async () => {
              const resultat = await api
                .genererExamens(promotionId, {
                  session,
                  date,
                  heure_debut: debut,
                  heure_fin: fin,
                })
                .catch((e) => {
                  setErreur(e instanceof Error ? e.message : "Génération impossible.");
                  return null;
                });
              if (resultat) {
                setBilan({
                  titre: `${resultat.crees} épreuve(s) posée(s) au même créneau — à étaler ensuite`,
                  ecarts: resultat.ignores,
                });
                await charger();
              }
            }}
            className={BOUTON_PLAT}
          >
            <AutoAwesomeMotionOutlined style={{ fontSize: 16 }} />
            Une épreuve par élément
          </button>
          <span className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <ContentCopyOutlined style={{ fontSize: 16 }} />
            Copier vers
            <select
              aria-label="Session de destination"
              className={CHAMP}
              value={cible}
              onChange={(e) => setCible(e.target.value)}
            >
              {sessions
                .filter((s) => s.cle !== session)
                .map((s) => (
                  <option key={s.cle} value={s.cle}>
                    {s.libelle}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const resultat = await api
                  .copierExamens(promotionId, session, cible)
                  .catch((e) => {
                    setErreur(e instanceof Error ? e.message : "Copie impossible.");
                    return null;
                  });
                if (resultat)
                  setBilan({
                    titre: `${resultat.crees} épreuve(s) copiée(s)`,
                    ecarts: resultat.ignores,
                  });
              }}
              className={BOUTON_PLAT}
            >
              Copier
            </button>
          </span>
        </div>
      )}

      {peutGerer && ouvertAjout && (
        <Carte titre="Nouvelle épreuve">
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_9rem_7rem_7rem_auto]">
            <select
              aria-label="Élément constitutif"
              className={CHAMP}
              value={element}
              onChange={(e) => setElement(e.target.value)}
            >
              <option value="">Choisir le cours…</option>
              {elements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code_ue} — {e.intitule}
                </option>
              ))}
            </select>
            <input
              aria-label="Date"
              type="date"
              className={CHAMP}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              aria-label="Heure de début"
              type="time"
              className={CHAMP}
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
            />
            <input
              aria-label="Heure de fin"
              type="time"
              className={CHAMP}
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
            <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <input type="checkbox" checked={oral} onChange={(e) => setOral(e.target.checked)} />
              Oral
            </label>
          </div>
          <div className="flex gap-2 border-t border-hairline px-4 py-3">
            <button
              type="button"
              disabled={busy || !element || !date}
              onClick={async () => {
                const ok = await agir(
                  () =>
                    api.creerExamen(promotionId, {
                      element_id: Number(element),
                      session,
                      date,
                      heure_debut: debut,
                      heure_fin: fin,
                      est_oral: oral,
                    }),
                  "Épreuve programmée."
                );
                if (ok) setElement("");
              }}
              className={BOUTON}
            >
              Programmer
            </button>
            <button
              type="button"
              onClick={() => setOuvertAjout(false)}
              className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Annuler
            </button>
          </div>
        </Carte>
      )}

      <Carte
        titre={`Planning — ${planning?.session_libelle ?? ""}`}
        sousTitre="Une épreuve par cours et par session. Deux épreuves ne peuvent pas se chevaucher."
      >
        {planning === null ? (
          <Vide message="Chargement…" />
        ) : planning.examens.length === 0 ? (
          <Vide message="Aucune épreuve programmée pour cette session." />
        ) : (
          <div className="divide-y divide-hairline">
            {planning.examens.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-[9rem] flex-none text-label-md tabular-nums text-on-surface-variant">
                  {new Date(e.date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="w-[7rem] flex-none text-label-md tabular-nums text-on-surface-variant">
                  {e.heure_debut}–{e.heure_fin}
                </span>
                <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                  {e.titre}
                  <span className="ml-2 font-mono text-label-md text-outline">{e.code_ue}</span>
                </span>
                {e.est_oral && <Pastille ton="neutre">Oral</Pastille>}
                {/* Un oral n'attend pas de questionnaire : ne rien afficher
                    évite une alerte que personne ne peut éteindre. */}
                {e.questionnaire_attendu && (
                  <Pastille ton={e.questionnaire_depose_le ? "ok" : "attente"}>
                    <DescriptionOutlined style={{ fontSize: 13 }} />
                    {e.questionnaire_depose_le ? "Questionnaire déposé" : "Questionnaire attendu"}
                  </Pastille>
                )}
                <Pastille ton={e.pointes ? "info" : "neutre"}>
                  {e.presents}/{e.inscrits} présents
                </Pastille>
                <Link
                  href={`/promotions/${promotionId}/examens/${e.id}`}
                  className="flex-none text-label-md font-semibold text-primary hover:underline"
                >
                  <HowToRegOutlined style={{ fontSize: 15 }} /> Appel
                </Link>
                {peutGerer && (
                  <button
                    type="button"
                    disabled={busy}
                    title="Supprimer l'épreuve"
                    onClick={() =>
                      agir(() => api.supprimerExamen(e.id, e.pointes > 0), "Épreuve supprimée.")
                    }
                    className="flex-none rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-error/8 hover:text-error"
                  >
                    <DeleteOutlineOutlined style={{ fontSize: 17 }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Carte>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
