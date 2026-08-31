"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowBackOutlined,
  CheckCircleOutlined,
  ChatBubbleOutlineOutlined,
  ErrorOutlineOutlined,
  HighlightOffOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import {
  operationsApi,
  type ExecutionProcess,
  type ReponsePoint,
  type ValeurPoint,
} from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

type Ecriture = { valeur?: ValeurPoint; commentaire?: string | null; anomalie?: boolean | null };

/** L'heure seule quand le relevé est du même jour que la lecture, la date
 *  entière sinon : « 09:42 » suffit sur une ronde du matin, et on ne fait pas
 *  répéter la date à quarante lignes. */
function heure(iso: string): string {
  const quand = new Date(iso);
  const memeJour = quand.toDateString() === new Date().toDateString();
  return memeJour
    ? quand.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : quand.toLocaleString("fr-FR");
}

/** Combien de temps la ronde a pris. Deux exécutions du même process aux durées
 *  très différentes disent quelque chose que les compteurs ne disent pas. */
function duree(debut: string, fin: string): string {
  const minutes = Math.max(
    0,
    Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste ? `${heures} h ${String(reste).padStart(2, "0")}` : `${heures} h`;
}

/** Passer la checklist.
 *
 *  **Chaque point est une question**, et son type décide de la saisie : une
 *  case se coche, un compteur se relève, un constat s'écrit. Une seule
 *  commande — « répondre » — porte tous les types : au serveur de décider si
 *  la valeur est une anomalie.
 *
 *  **« pas encore vu » n'est pas « vu et pas fait ».** Un extincteur manquant
 *  se relève ; le confondre avec un point non passé ferait disparaître le
 *  manquement, ce qu'un registre de contrôle doit précisément empêcher.
 *
 *  **Chaque réponse part au serveur immédiatement.** Une ronde se fait en
 *  marchant, souvent sur un téléphone : un « enregistrer » à la fin perdrait
 *  tout au premier écran verrouillé.
 */
export default function ExecutionPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { can } = usePermissions();
  const peutExecuter = can("operations.process.executer");

  const [execution, setExecution] = useState<ExecutionProcess | null>(null);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [commentaires, setCommentaires] = useState<Record<number, boolean>>({});

  const charger = useCallback(async () => {
    try {
      const e = await operationsApi.execution(id);
      setExecution(e);
      setNote(e.note ?? "");
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Exécution introuvable.");
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function repondre(reponse: ReponsePoint, ecriture: Ecriture) {
    setErreur(null);
    try {
      setExecution(
        await operationsApi.repondre(id, reponse.id, {
          valeur: "valeur" in ecriture ? ecriture.valeur : reponse.valeur,
          commentaire: "commentaire" in ecriture ? ecriture.commentaire : reponse.commentaire,
          // On ne réaffirme pas le drapeau à chaque écriture : sans lui, le
          // serveur le recalcule depuis la valeur, ce qu'on veut quand c'est
          // la valeur qui change.
          anomalie: ecriture.anomalie,
        }),
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer ce point.");
    }
  }

  async function conclure(statut: "TERMINEE" | "ABANDONNEE") {
    setBusy(true);
    setErreur(null);
    try {
      setExecution(await operationsApi.conclureExecution(id, statut, note));
      setToast(statut === "TERMINEE" ? "Exécution terminée." : "Exécution abandonnée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de conclure.");
    } finally {
      setBusy(false);
    }
  }

  const enCours = execution?.statut === "EN_COURS";
  const modifiable = !!enCours && peutExecuter;

  // Regroupées par étape, dans l'ordre figé à l'ouverture. Une ronde se lit
  // endroit par endroit — c'est ainsi qu'on la marche.
  const etapes: { titre: string | null; consigne: string | null; reponses: ReponsePoint[] }[] =
    [];
  for (const r of execution?.reponses ?? []) {
    const derniere = etapes[etapes.length - 1];
    if (derniere && derniere.titre === r.section_titre) derniere.reponses.push(r);
    else
      etapes.push({ titre: r.section_titre, consigne: r.section_consigne, reponses: [r] });
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[760px] p-4 md:p-8">
        <Link
          href="/process"
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Process
        </Link>

        <h1 className="mt-2 font-display text-headline-sm text-on-surface">
          {execution?.process_nom ?? "…"}
        </h1>
        {execution && (
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Ouverte le {new Date(execution.ouverte_le).toLocaleString("fr-FR")}
            {execution.ouverte_par_nom ? ` par ${execution.ouverte_par_nom}` : ""} · checklist
            version {execution.process_version} · {execution.statut_libelle}
            {execution.close_le
              ? ` le ${new Date(execution.close_le).toLocaleString("fr-FR")}`
              : ""}
            {execution.close_par_nom ? ` par ${execution.close_par_nom}` : ""}
            {execution.close_le
              ? ` · ${duree(execution.ouverte_le, execution.close_le)}`
              : ""}
          </p>
        )}

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {execution && (
          <>
            <div className="mt-4 flex flex-wrap gap-2 text-label-md">
              <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-secondary">
                {execution.repondus} sur {execution.points} répondu
                {execution.repondus > 1 ? "s" : ""}
              </span>
              {execution.anomalies > 0 && (
                <span className="rounded-full bg-error-container/40 px-2.5 py-1 text-error">
                  {execution.anomalies} anomalie{execution.anomalies > 1 ? "s" : ""}
                </span>
              )}
              {execution.restants > 0 && (
                <span className="rounded-full bg-surface-container px-2.5 py-1 text-on-surface-variant">
                  {execution.restants} restant{execution.restants > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="mt-5 space-y-5">
              {etapes.map((etape, e) => (
                <section key={e}>
                  {etape.titre && (
                    <div className="mb-2">
                      <h2 className="text-body-md font-semibold text-on-surface">
                        {etape.titre}
                      </h2>
                      {/* La consigne est une instruction pour celui qui marche —
                          elle n'a de sens qu'affichée au moment où il y est. */}
                      {etape.consigne && (
                        <p className="mt-0.5 max-w-[70ch] text-body-sm text-on-surface-variant">
                          {etape.consigne}
                        </p>
                      )}
                    </div>
                  )}
                  <ol className="space-y-2">
                    {etape.reponses.map((r) => (
                      <li
                        key={r.id}
                        className={`rounded-2xl border p-3 transition-colors ${
                          r.anomalie
                            ? "border-error/40 bg-error-container/20"
                            : r.valeur !== null
                              ? "border-secondary/40 bg-secondary/5"
                              : "border-outline-soft bg-surface-container-lowest"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <span className="min-w-0 flex-1">
                            <span className="block text-body-sm text-on-surface">
                              {r.point_libelle}
                              {!r.obligatoire && (
                                <span className="ml-1.5 text-label-sm text-outline">
                                  (facultatif)
                                </span>
                              )}
                            </span>
                            {r.point_aide && (
                              <span className="mt-0.5 block text-label-md text-outline">
                                {r.point_aide}
                              </span>
                            )}
                          </span>

                          <span className="flex shrink-0 items-center gap-1">
                            {/* Le drapeau explicite : l'agent est sur place, la
                                règle ne l'est pas. Un constat écrit n'est ni bon
                                ni mauvais en soi — lui seul peut le dire. */}
                            <button
                              type="button"
                              disabled={!modifiable}
                              aria-pressed={r.anomalie}
                              title="Signaler une anomalie sur ce point"
                              onClick={() => void repondre(r, { anomalie: !r.anomalie })}
                              className={`inline-flex h-8 items-center gap-1 rounded-lg px-2 text-label-md transition-colors disabled:opacity-40 ${
                                r.anomalie
                                  ? "bg-error text-on-error"
                                  : "border border-outline-soft text-on-surface-variant hover:border-error hover:text-error"
                              }`}
                            >
                              <ErrorOutlineOutlined style={{ fontSize: 15 }} />
                              Anomalie
                            </button>
                            <button
                              type="button"
                              disabled={!modifiable && !r.commentaire}
                              aria-label="Commenter ce point"
                              onClick={() =>
                                setCommentaires((c) => ({ ...c, [r.id]: !c[r.id] }))
                              }
                              className="text-outline transition-colors hover:text-primary disabled:opacity-40"
                            >
                              <ChatBubbleOutlineOutlined style={{ fontSize: 17 }} />
                            </button>
                          </span>
                        </div>

                        {r.repondu_le && (
                          <p className="mt-1 text-label-md text-outline">
                            Relevé à {heure(r.repondu_le)}
                            {r.repondu_par_nom ? ` par ${r.repondu_par_nom}` : ""}
                          </p>
                        )}

                        <div className="mt-2">
                          <SaisiePoint
                            reponse={r}
                            modifiable={modifiable}
                            onRepondre={(valeur) => void repondre(r, { valeur })}
                          />
                        </div>

                        {(r.anomalie || r.commentaire || commentaires[r.id]) && (
                          <input
                            className={`${CHAMP} mt-2`}
                            placeholder="Ce qui a été constaté"
                            defaultValue={r.commentaire ?? ""}
                            disabled={!modifiable}
                            onBlur={(ev) => {
                              if ((r.commentaire ?? "") === ev.target.value) return;
                              void repondre(r, { commentaire: ev.target.value });
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>

            <section className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
              <label className="block">
                <span className="mb-1 block text-label-md text-on-surface-variant">
                  Note de fin (facultative)
                </span>
                <input
                  className={CHAMP}
                  value={note}
                  disabled={!modifiable}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>

              {modifiable ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void conclure("TERMINEE")}
                    className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Terminer
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void conclure("ABANDONNEE")}
                    className="inline-flex h-9 items-center rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface-variant transition-colors hover:border-error hover:text-error disabled:opacity-40"
                  >
                    Abandonner
                  </button>
                  <span className="max-w-[44ch] text-label-md text-outline">
                    Un point obligatoire sans réponse empêche de terminer — et l&apos;écran
                    dira lequel.
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-body-sm text-on-surface-variant">
                  {enCours
                    ? "Vous n'avez pas le droit d'exécuter ce process."
                    : "Cette exécution est close : elle ne se modifie plus."}
                </p>
              )}
            </section>
          </>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}

/** La saisie d'un point, selon le type de sa question.
 *
 *  Le type vient de la RÉPONSE et non du process : une exécution ouverte hier
 *  garde la question telle qu'elle était, même si la checklist a changé depuis.
 */
function SaisiePoint({
  reponse,
  modifiable,
  onRepondre,
}: {
  reponse: ReponsePoint;
  modifiable: boolean;
  onRepondre: (valeur: ValeurPoint) => void;
}) {
  const { type, valeur } = reponse;

  if (type === "CASE") {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Bouton
          actif={valeur === true}
          teinte="ok"
          disabled={!modifiable}
          onClick={() => onRepondre(valeur === true ? null : true)}
        >
          <CheckCircleOutlined style={{ fontSize: 15 }} />
          Fait
        </Bouton>
        <Bouton
          actif={valeur === false}
          teinte="ko"
          disabled={!modifiable}
          onClick={() => onRepondre(valeur === false ? null : false)}
        >
          <HighlightOffOutlined style={{ fontSize: 15 }} />
          Pas fait
        </Bouton>
      </div>
    );
  }

  if (type === "NOMBRE") {
    const hors =
      typeof valeur === "number" &&
      ((reponse.minimum !== null && valeur < reponse.minimum) ||
        (reponse.maximum !== null && valeur > reponse.maximum));
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="any"
          className={`${CHAMP} w-40`}
          placeholder="Valeur relevée"
          defaultValue={typeof valeur === "number" ? valeur : ""}
          disabled={!modifiable}
          key={String(valeur)}
          onBlur={(e) => {
            const brute = e.target.value.trim();
            const suivante = brute === "" ? null : Number(brute);
            if (suivante === valeur) return;
            onRepondre(suivante);
          }}
        />
        {reponse.unite && <span className="text-label-md text-outline">{reponse.unite}</span>}
        {(reponse.minimum !== null || reponse.maximum !== null) && (
          <span className={`text-label-md ${hors ? "text-error" : "text-outline"}`}>
            attendu {reponse.minimum ?? "—"} à {reponse.maximum ?? "—"}
          </span>
        )}
      </div>
    );
  }

  if (type === "TEXTE_LONG") {
    return (
      <textarea
        rows={3}
        className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
        placeholder="Votre constat"
        defaultValue={typeof valeur === "string" ? valeur : ""}
        disabled={!modifiable}
        onBlur={(e) => {
          if ((typeof valeur === "string" ? valeur : "") === e.target.value) return;
          onRepondre(e.target.value || null);
        }}
      />
    );
  }

  if (type === "CHOIX_UNIQUE" || type === "CHOIX_MULTIPLE") {
    const choisies = Array.isArray(valeur) ? valeur : valeur === null ? [] : [String(valeur)];
    return (
      <div className="flex flex-wrap gap-1.5">
        {reponse.options.map((option) => {
          const actif = choisies.includes(option);
          return (
            <Bouton
              key={option}
              actif={actif}
              teinte="neutre"
              disabled={!modifiable}
              onClick={() => {
                if (type === "CHOIX_UNIQUE") {
                  onRepondre(actif ? null : option);
                  return;
                }
                const suivant = actif
                  ? choisies.filter((c) => c !== option)
                  : [...choisies, option];
                onRepondre(suivant.length ? suivant : null);
              }}
            >
              {option}
            </Bouton>
          );
        })}
      </div>
    );
  }

  const html = type === "DATE" ? "date" : type === "HEURE" ? "time" : "text";
  return (
    <input
      type={html}
      className={`${CHAMP} ${html === "text" ? "" : "w-44"}`}
      placeholder="Votre réponse"
      defaultValue={typeof valeur === "string" ? valeur : ""}
      disabled={!modifiable}
      onBlur={(e) => {
        if ((typeof valeur === "string" ? valeur : "") === e.target.value) return;
        onRepondre(e.target.value || null);
      }}
    />
  );
}

function Bouton({
  actif,
  teinte,
  disabled,
  onClick,
  children,
}: {
  actif: boolean;
  teinte: "ok" | "ko" | "neutre";
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const plein =
    teinte === "ok"
      ? "bg-secondary text-on-secondary"
      : teinte === "ko"
        ? "bg-error text-on-error"
        : "bg-primary text-on-primary";
  const vide =
    teinte === "ok"
      ? "hover:border-secondary hover:text-secondary"
      : teinte === "ko"
        ? "hover:border-error hover:text-error"
        : "hover:border-primary hover:text-primary";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={actif}
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-label-md transition-colors disabled:opacity-40 ${
        actif ? plein : `border border-outline-soft text-on-surface-variant ${vide}`
      }`}
    >
      {children}
    </button>
  );
}
