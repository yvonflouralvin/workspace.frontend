"use client";

import { useState } from "react";
import { GavelOutlined, LockOutlined } from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import {
  VERDICT_EFFETS,
  VERDICT_ORDER,
  jalonsApi,
  verdictLabel,
  type JalonDetail,
  type ResultatDecision,
  type Verdict,
} from "@/app/lib/jalons-api";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

/** Convocation puis décision.
 *
 *  Deux actes distincts, volontairement séparés : convoquer FIGE les critères et
 *  ne se défait pas sans trace, décider est définitif. L'interface dit ce que
 *  chacun fait AVANT le clic, et ne met aucun verdict en avant. */
export function DecisionJalon({
  jalon,
  canManage,
  onChange,
}: {
  jalon: JalonDetail;
  canManage: boolean;
  onChange: (resultat?: ResultatDecision) => void | Promise<void>;
}) {
  const [convocation, setConvocation] = useState(false);
  const [revision, setRevision] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [valeurs, setValeurs] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decisionCourante = jalon.decisions[0] ?? null;
  const enAttente = jalon.statut === "en_attente_decision";
  const decide = jalon.statut !== "a_venir" && jalon.statut !== "en_attente_decision";
  const formulaireOuvert = enAttente || revision;

  async function convoquer() {
    setBusy(true);
    setError(null);
    try {
      await jalonsApi.ouvrirDecision(jalon.id);
      setConvocation(false);
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Convocation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function decider() {
    if (!verdict) return;
    setBusy(true);
    setError(null);
    try {
      const resultat = await jalonsApi.decider(jalon.id, {
        verdict,
        commentaire: commentaire.trim() || null,
        valeurs: jalon.criteres.map((c) => ({
          critere_id: c.id,
          valeur: (valeurs[c.id] ?? c.valeur_pre_remplie ?? "").trim() || null,
        })),
        revise_decision_id: revision && decisionCourante ? decisionCourante.id : null,
      });
      setVerdict(null);
      setCommentaire("");
      setValeurs({});
      setRevision(false);
      await onChange(resultat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Décision impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <p className="text-label-sm uppercase text-outline mb-2">Décision</p>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        {/* ── Avant convocation ─────────────────────────────────────────── */}
        {jalon.statut === "a_venir" && (
          <>
            <p className="text-body-md font-semibold text-on-surface">
              La gate n&apos;est pas encore convoquée
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Les critères restent modifiables. Convoquer la décision les fige : ils ne
              pourront plus changer, sauf déverrouillage motivé et tracé. C&apos;est le
              préalable obligatoire à toute décision.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => setConvocation(true)}
                className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
              >
                <LockOutlined style={{ fontSize: 16 }} />
                Convoquer la décision
              </button>
            )}
          </>
        )}

        {/* ── Décision rendue ───────────────────────────────────────────── */}
        {decide && !revision && (
          <>
            <p className="text-body-md font-semibold text-on-surface">
              {decisionCourante
                ? verdictLabel(jalon.role, decisionCourante.verdict)
                : "Décision rendue"}
            </p>
            {decisionCourante && (
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Par {decisionCourante.decide_par_nom_cache ?? "—"}. Une décision ne se modifie
                pas : elle se révise par une nouvelle décision, et les deux restent lisibles.
              </p>
            )}
            {jalon.peut_decider && (
              <button
                type="button"
                onClick={() => setRevision(true)}
                className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <GavelOutlined style={{ fontSize: 16 }} />
                Réviser la décision
              </button>
            )}
          </>
        )}

        {/* ── Formulaire de décision ────────────────────────────────────── */}
        {formulaireOuvert &&
          (jalon.peut_decider ? (
            <>
              {revision && (
                <p className="mb-3 text-body-sm text-on-surface-variant">
                  La décision précédente restera dans l&apos;historique — celle-ci s&apos;y
                  ajoute et la remplace comme décision courante.
                </p>
              )}

              {jalon.criteres.length > 0 && (
                <div className="mb-4">
                  <p className="text-label-sm uppercase text-outline mb-2">Ce qui est constaté</p>
                  <div className="space-y-2">
                    {jalon.criteres.map((critere) => (
                      <div
                        key={critere.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-soft px-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-body-sm text-on-surface">
                            {critere.libelle}
                          </span>
                          {critere.cible && (
                            <span className="block text-label-md text-outline">
                              Cible {critere.cible}
                            </span>
                          )}
                        </span>
                        <input
                          value={valeurs[critere.id] ?? critere.valeur_pre_remplie ?? ""}
                          onChange={(e) =>
                            setValeurs((v) => ({ ...v, [critere.id]: e.target.value }))
                          }
                          placeholder="Valeur constatée"
                          className="h-8 w-[200px] max-w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-label-md text-outline">
                    Ces valeurs sont figées avec la décision. Elles l&apos;éclairent — elles ne
                    la déterminent pas.
                  </p>
                </div>
              )}

              <p className="text-label-sm uppercase text-outline mb-2">Verdict</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VERDICT_ORDER.map((v) => {
                  const choisi = verdict === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVerdict(v)}
                      aria-pressed={choisi}
                      className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                        choisi
                          ? "border-primary bg-primary/5"
                          : "border-outline-soft hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="block text-body-sm font-semibold text-on-surface">
                        {verdictLabel(jalon.role, v)}
                      </span>
                      <span className="block mt-0.5 text-label-md text-on-surface-variant">
                        {VERDICT_EFFETS[v]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={3}
                placeholder="Ce qui motive ce verdict…"
                className={`${FIELD} mt-3 resize-none`}
              />

              <p className="mt-2 text-label-md text-outline">
                La décision est définitive et horodatée. Elle ne peut ni être modifiée ni
                supprimée — seulement révisée par une décision ultérieure.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !verdict}
                  title={!verdict ? "Choisissez un verdict" : undefined}
                  onClick={decider}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
                >
                  <GavelOutlined style={{ fontSize: 16 }} />
                  Rendre la décision
                </button>
                {revision && (
                  <button
                    type="button"
                    onClick={() => {
                      setRevision(false);
                      setVerdict(null);
                    }}
                    className="h-9 px-3 rounded-lg text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-body-md font-semibold text-on-surface">
                En attente de décision
              </p>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Les critères sont figés. La décision revient au décideur désigné de ce jalon,
                ou à un propriétaire du projet.
              </p>
            </>
          ))}

        {error && (
          <p className="mt-3 text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {convocation && (
        <ConfirmDialog
          title="Convoquer la décision ?"
          tone="primary"
          confirmLabel="Convoquer et figer"
          busy={busy}
          onCancel={() => setConvocation(false)}
          onConfirm={convoquer}
          message={
            <>
              Les {jalon.criteres.length} critère{jalon.criteres.length > 1 ? "s" : ""} de ce
              jalon seront <strong>figés</strong> : ils ne pourront plus être modifiés, et le
              jalon passera en attente de décision. Rouvrir un critère figé restera possible,
              mais exigera un motif conservé avec votre nom.
            </>
          }
        />
      )}
    </section>
  );
}
