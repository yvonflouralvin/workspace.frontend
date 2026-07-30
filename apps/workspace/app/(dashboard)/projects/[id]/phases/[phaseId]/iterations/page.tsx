"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, LockOutlined, PlayArrowOutlined } from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import {
  ITERATION_STATUT_LABELS,
  ITERATION_STATUT_TONES,
  iterationsApi,
  type Iteration,
  type IterationSnapshot,
} from "@/app/lib/iterations-api";
import { refusBlocage, type RefusBlocage, type Task } from "@/app/lib/projects-api";
import { MotifsBlocage } from "@/components/projects/MotifsBlocage";
import { useProject } from "../../../project-context";
import { usePhase } from "../phase-context";

const FIELD =
  "h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1";

/** Une date ISO ramenée au format attendu par un champ `date`. */
function jour(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** Un champ date vide vaut « non renseignée », pas une date fausse. */
function iso(valeur: string): string | null {
  return valeur ? new Date(valeur).toISOString() : null;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function IterationsPage() {
  const { phase, canManage } = usePhase();
  const { projectId, project, tasks, reloadTasks } = useProject();

  const [iterations, setIterations] = useState<Iteration[] | null>(null);
  const [snapshots, setSnapshots] = useState<Record<number, IterationSnapshot>>({});
  const [nom, setNom] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [capacite, setCapacite] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [refus, setRefus] = useState<RefusBlocage | null>(null);
  const [aCloturer, setACloturer] = useState<Iteration | null>(null);
  const [aOuvrir, setAOuvrir] = useState<Iteration | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const liste = await iterationsApi.list(phase.id);
    setIterations(liste);
    const closes = liste.filter((i) => i.statut === "cloturee");
    const lus = await Promise.all(
      closes.map((i) => iterationsApi.snapshot(i.id).catch(() => null))
    );
    const carte: Record<number, IterationSnapshot> = {};
    closes.forEach((i, index) => {
      const snap = lus[index];
      if (snap) carte[i.id] = snap;
    });
    setSnapshots(carte);
  }, [phase.id]);

  useEffect(() => {
    charger().catch(() => setIterations([]));
  }, [charger]);

  async function agir(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setErreur(null);
    setRefus(null);
    try {
      await fn();
      await charger();
      await reloadTasks();
      setToast(message);
    } catch (e) {
      // Un refus doit se LIRE : l'écran des outils muet est encore frais.
      const bloque = refusBlocage(e);
      if (bloque) setRefus(bloque);
      else setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  const libres = tasks.filter((t) => t.phase_id === phase.id && !t.iteration_id);
  const unite = project.unite_estimation ?? "aucune";
  // Une fin antérieure au début n'est pas une itération : on le dit avant l'envoi.
  const incoherence =
    debut && fin && fin < debut ? "La fin prévue précède le début prévu." : null;

  return (
    <div className="max-w-[820px] space-y-5">
      <p className="text-body-sm text-on-surface-variant">
        Une itération est une fenêtre fermée : ce qui y est engagé à l&apos;ouverture est figé,
        et sa vélocité se lit telle qu&apos;elle a été mesurée à la clôture.
      </p>

      {refus && <MotifsBlocage refus={refus} projectId={projectId} />}
      {erreur && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{erreur}</p>
      )}

      {canManage && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 min-w-[220px]">
            <span className={LABEL}>Nom</span>
            <input
              className={`${FIELD} w-full`}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Sprint 1, Semaine 12…"
            />
          </label>
          <label>
            <span className={LABEL}>Début prévu</span>
            <input type="date" className={FIELD} value={debut} onChange={(e) => setDebut(e.target.value)} />
          </label>
          <label>
            <span className={LABEL}>Fin prévue</span>
            <input type="date" className={FIELD} value={fin} onChange={(e) => setFin(e.target.value)} />
          </label>
          <label>
            <span className={LABEL}>Capacité</span>
            <input
              type="number"
              min={0}
              className={`${FIELD} w-24`}
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
              placeholder={unite === "aucune" ? "—" : unite}
            />
          </label>
          <button
            type="button"
            disabled={busy || !nom.trim() || Boolean(incoherence)}
            title={incoherence ?? undefined}
            onClick={() =>
              agir(
                () =>
                  iterationsApi.create(phase.id, {
                    nom: nom.trim(),
                    date_debut: iso(debut),
                    date_fin: iso(fin),
                    capacite: capacite.trim() ? Number(capacite) : null,
                  }),
                "Itération créée."
              ).then(() => {
                setNom("");
                setDebut("");
                setFin("");
                setCapacite("");
              })
            }
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Créer
          </button>
          {incoherence && (
            <p className="w-full text-label-md text-error">{incoherence}</p>
          )}
        </div>
      )}

      {iterations === null && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}
      {iterations?.length === 0 && (
        <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-center text-body-sm text-on-surface-variant">
          Aucune itération sur cette phase.
        </p>
      )}

      <div className="space-y-3">
        {iterations?.map((iteration) => {
          const tone = ITERATION_STATUT_TONES[iteration.statut]!;
          const snap = snapshots[iteration.id];
          const rattachees = tasks.filter((t) => t.iteration_id === iteration.id);
          return (
            <section
              key={iteration.id}
              className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-md font-semibold text-on-surface">{iteration.nom}</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}
                >
                  <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
                  {ITERATION_STATUT_LABELS[iteration.statut]}
                </span>
                {iteration.statut === "cloturee" || !canManage ? (
                  <span className="ml-auto text-label-md text-outline">
                    {fmt(iteration.date_debut)} → {fmt(iteration.date_fin)}
                  </span>
                ) : (
                  // Modifiables tant que rien n'est mesuré : une itération se
                  // replanifie, elle ne se recrée pas pour deux jours de décalage.
                  <span className="ml-auto flex items-center gap-1.5">
                    <input
                      type="date"
                      aria-label="Début prévu"
                      className={`${FIELD} h-8`}
                      value={jour(iteration.date_debut)}
                      onChange={(e) =>
                        agir(
                          () => iterationsApi.update(iteration.id, { date_debut: iso(e.target.value) }),
                          "Début prévu mis à jour."
                        )
                      }
                    />
                    <span className="text-outline" aria-hidden>→</span>
                    <input
                      type="date"
                      aria-label="Fin prévue"
                      className={`${FIELD} h-8`}
                      value={jour(iteration.date_fin)}
                      onChange={(e) =>
                        agir(
                          () => iterationsApi.update(iteration.id, { date_fin: iso(e.target.value) }),
                          "Fin prévue mise à jour."
                        )
                      }
                    />
                  </span>
                )}
              </div>

              {iteration.statut !== "cloturee" && (
                <>
                  <p className="mt-1 text-label-md text-outline">
                    {iteration.taches_rattachees} élément
                    {iteration.taches_rattachees > 1 ? "s" : ""}
                    {unite !== "aucune" && ` · ${iteration.points_rattaches} ${unite}`}
                    {/* La capacité SITUE l'engagement, elle ne le limite pas :
                        aucune règle ne s'en sert pour refuser un rattachement. */}
                    {iteration.capacite != null && ` sur ${iteration.capacite} de capacité`}
                    {iteration.engagement_le && " · engagement figé"}
                  </p>

                  <ul className="mt-2 space-y-1">
                    {rattachees.map((tache) => (
                      <li key={tache.id} className="flex items-center gap-2 text-body-sm">
                        <span className="text-on-surface truncate">{tache.title}</span>
                        <span className="text-label-md text-outline">{tache.etat_libelle}</span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() =>
                              agir(
                                () => iterationsApi.detacher(iteration.id, tache.id),
                                "Élément détaché."
                              )
                            }
                            className="ml-auto text-label-md text-on-surface-variant hover:text-error transition-colors"
                          >
                            Détacher
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {canManage && libres.length > 0 && (
                    <select
                      className={`${FIELD} mt-2 w-full`}
                      value=""
                      onChange={(e) =>
                        e.target.value &&
                        agir(
                          () => iterationsApi.rattacher(iteration.id, [Number(e.target.value)]),
                          "Élément rattaché."
                        )
                      }
                    >
                      <option value="">Rattacher un élément…</option>
                      {libres.map((t: Task) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {canManage && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {iteration.statut === "planifiee" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setAOuvrir(iteration)}
                          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
                        >
                          <PlayArrowOutlined style={{ fontSize: 16 }} />
                          Ouvrir
                        </button>
                      )}
                      {iteration.statut === "en_cours" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setACloturer(iteration)}
                          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 transition-colors"
                        >
                          <LockOutlined style={{ fontSize: 16 }} />
                          Clôturer
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          agir(() => iterationsApi.remove(iteration.id), "Itération supprimée.")
                        }
                        className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:text-error transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </>
              )}

              {snap && (
                <div className="mt-2 rounded-xl bg-locked-surface border border-locked-container/60 p-3">
                  <p className="flex items-center gap-1.5 text-label-md font-medium text-locked">
                    <LockOutlined style={{ fontSize: 13 }} />
                    Mesurée le {fmt(snap.cloture_le)} par {snap.cloture_par_nom_cache ?? "—"}
                  </p>
                  <p className="mt-1.5 text-body-sm text-on-surface">
                    Engagé {snap.points_engages} · livré{" "}
                    <span className="font-semibold">{snap.points_livres}</span>
                    {snap.unite_estimation !== "aucune" && ` ${snap.unite_estimation}`}
                    <span className="text-outline">
                      {" "}
                      ({snap.livraison?.length ?? 0}/{snap.engagement?.length ?? 0} éléments)
                    </span>
                  </p>
                  {snap.commentaire && (
                    <p className="mt-1 text-body-sm text-on-surface-variant whitespace-pre-wrap">
                      {snap.commentaire}
                    </p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {aOuvrir && (
        <ConfirmDialog
          title={`Ouvrir « ${aOuvrir.nom} » ?`}
          tone="primary"
          confirmLabel="Ouvrir et figer l'engagement"
          busy={busy}
          onCancel={() => setAOuvrir(null)}
          onConfirm={() =>
            agir(() => iterationsApi.ouvrir(aOuvrir.id), "Itération ouverte.").then(() =>
              setAOuvrir(null)
            )
          }
          message={
            <>
              Les {aOuvrir.taches_rattachees} élément
              {aOuvrir.taches_rattachees > 1 ? "s" : ""} rattaché
              {aOuvrir.taches_rattachees > 1 ? "s" : ""} et leur estimation d&apos;aujourd&apos;hui
              seront <strong>figés</strong> comme engagement. En ajouter ensuite ne le changera
              pas — c&apos;est ce qui permet de comparer ce qui était prévu à ce qui a été livré.
            </>
          }
        />
      )}

      {aCloturer && (
        <ConfirmDialog
          title={`Clôturer « ${aCloturer.nom} » ?`}
          confirmLabel="Clôturer et mesurer"
          busy={busy}
          onCancel={() => setACloturer(null)}
          onConfirm={() =>
            agir(() => iterationsApi.cloturer(aCloturer.id, null), "Itération clôturée.").then(() =>
              setACloturer(null)
            )
          }
          message={
            <>
              La vélocité sera <strong>figée définitivement</strong> : réestimer un élément plus
              tard ne la changera plus. Les éléments non terminés doivent d&apos;abord être
              reportés vers une autre itération ou détachés.
            </>
          }
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
