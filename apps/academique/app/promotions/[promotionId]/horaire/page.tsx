"use client";

import { useCallback, useEffect, useState } from "react";
import { DeleteOutlineOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { api, type Enseignant, type Programme, type Seance } from "@/app/lib/api";
import { BOUTON, BOUTON_PLAT, CHAMP, Carte, Erreur, Pastille, Vide } from "@/components/Bloc";
import { useContexte } from "@/app/lib/etablissement";
import { usePromotion } from "../promotion-context";

const TON: Record<string, string> = { PREVUE: "attente", TENUE: "ok", ANNULEE: "alerte" };

/** L'emploi du temps d'une promotion.
 *
 *  Deux collisions sont refusées par le serveur, et ce ne sont pas les mêmes :
 *  la promotion ne suit pas deux cours à la fois, et **l'enseignant n'est pas
 *  dans deux salles à la fois**. Le refus nomme le cours qui bloque : l'écran le
 *  remonte tel quel, il porte l'information.
 */
export default function HorairePage() {
  const { promotionId } = usePromotion();
  const { can } = usePermissions();
  const contexte = useContexte();
  const peutGerer = can("academique.seances.manage");

  const [seances, setSeances] = useState<Seance[] | null>(null);
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [element, setElement] = useState("");
  const [enseignant, setEnseignant] = useState("");
  const [date, setDate] = useState("");
  const [debut, setDebut] = useState("08:00");
  const [fin, setFin] = useState("10:00");

  const charger = useCallback(async () => {
    try {
      setSeances(await api.seances(promotionId));
      setProgramme(await api.programme(promotionId));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setSeances([]);
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

  const elements = (programme?.unites ?? []).flatMap((u) =>
    u.elements.map((e) => ({ ...e, code_ue: u.code }))
  );

  return (
    <div className="space-y-4">
      <Erreur message={erreur} />

      {peutGerer && (
        <Carte titre="Nouvelle séance">
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_9rem_7rem_7rem_auto]">
            <select
              aria-label="Cours"
              className={CHAMP}
              value={element}
              onChange={(e) => setElement(e.target.value)}
            >
              <option value="">Cours…</option>
              {elements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code_ue} — {e.intitule}
                </option>
              ))}
            </select>
            <select
              aria-label="Enseignant"
              className={CHAMP}
              value={enseignant}
              onChange={(e) => setEnseignant(e.target.value)}
            >
              <option value="">Qui assure…</option>
              {enseignants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom_complet}
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
            <button
              type="button"
              disabled={busy || !element || !date}
              onClick={async () => {
                const ok = await agir(
                  () =>
                    api.creerSeance(promotionId, {
                      element_id: Number(element),
                      enseignant_id: enseignant ? Number(enseignant) : null,
                      date,
                      heure_debut: debut,
                      heure_fin: fin,
                    }),
                  "Séance posée."
                );
                if (ok) setElement("");
              }}
              className={BOUTON}
            >
              Poser
            </button>
          </div>
        </Carte>
      )}

      <Carte
        titre="Séances"
        sousTitre="Une séance annulée libère son créneau : elle n'a pas lieu."
      >
        {seances === null ? (
          <Vide message="Chargement…" />
        ) : seances.length === 0 ? (
          <Vide message="Aucune séance posée pour cette promotion." />
        ) : (
          <div className="divide-y divide-hairline">
            {seances.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-[9rem] flex-none text-label-md tabular-nums text-on-surface-variant">
                  {new Date(s.date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="w-[7rem] flex-none text-label-md tabular-nums text-on-surface-variant">
                  {s.heure_debut}–{s.heure_fin}
                </span>
                <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                  {s.element_intitule}
                  <span className="ml-2 font-mono text-label-md text-outline">{s.code_ue}</span>
                </span>
                <span className="w-[12rem] flex-none truncate text-label-md text-on-surface-variant">
                  {s.enseignant_nom || "—"}
                </span>
                <Pastille ton={TON[s.statut] ?? "neutre"} titre={s.motif_annulation ?? undefined}>
                  {s.statut_libelle}
                </Pastille>
                {peutGerer && s.statut === "PREVUE" && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        agir(
                          () => api.changerStatutSeance(s.id, { statut: "TENUE" }),
                          "Séance marquée tenue."
                        )
                      }
                      className="flex-none text-label-md font-semibold text-primary hover:underline"
                    >
                      Tenue
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const motif = window.prompt(
                          "Motif de l'annulation ? Sans raison, le cours ne se rattrape ni ne s'explique."
                        );
                        if (!motif) return;
                        void agir(
                          () =>
                            api.changerStatutSeance(s.id, {
                              statut: "ANNULEE",
                              motif_annulation: motif,
                            }),
                          "Séance annulée."
                        );
                      }}
                      className="flex-none text-label-md text-on-surface-variant hover:text-error"
                    >
                      Annuler
                    </button>
                  </>
                )}
                {peutGerer && (
                  <button
                    type="button"
                    disabled={busy}
                    title="Supprimer la séance"
                    onClick={() => agir(() => api.supprimerSeance(s.id), "Séance supprimée.")}
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
