"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircleOutlineOutlined,
  DeleteOutlineOutlined,
  ReportProblemOutlined,
  StickyNote2Outlined,
} from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import {
  operationsApi,
  type NatureNote,
  type NoteOperations,
  type SujetNote,
} from "@/lib/operations-api";

const CHAMP =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Le fil de notes d'un objet — une réservation, un usage de groupe.
 *
 *  Deux natures et une seule différence qui compte : une observation est un
 *  constat, un incident est un problème qui reste OUVERT tant que personne ne
 *  l'a clôturé. C'est ce qui permet de répondre à « qu'est-ce qui traîne ? »
 *  sans relire tout l'historique.
 */
export function FilDeNotes({
  sujetType,
  sujetId,
  compact,
}: {
  sujetType: SujetNote;
  sujetId: number;
  /** Dans un tiroir, on économise la hauteur. */
  compact?: boolean;
}) {
  const moi = useSessionStore((s) => s.user?.id);

  const [notes, setNotes] = useState<NoteOperations[] | null>(null);
  const [contenu, setContenu] = useState("");
  const [nature, setNature] = useState<NatureNote>("NOTE");
  const [aCloturer, setACloturer] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setNotes(await operationsApi.notes({ sujet_type: sujetType, sujet_id: sujetId }));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Notes indisponibles.");
      setNotes([]);
    }
  }, [sujetType, sujetId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function agir(action: () => Promise<unknown>) {
    setEnCours(true);
    setErreur(null);
    try {
      await action();
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Opération impossible.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section className={compact ? "" : "mt-6"}>
      <h3 className="flex items-center gap-1.5 text-body-md font-medium text-on-surface">
        <StickyNote2Outlined style={{ fontSize: 17 }} className="text-on-surface-variant" />
        Notes et incidents
      </h3>

      {erreur && (
        <p className="mt-2 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <textarea
          rows={compact ? 2 : 3}
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Observation, ou problème constaté…"
          className={CHAMP}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-outline-soft p-0.5">
            {([
              ["NOTE", "Note"],
              ["INCIDENT", "Incident"],
            ] as const).map(([cle, libelle]) => (
              <button
                key={cle}
                type="button"
                onClick={() => setNature(cle)}
                className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-body-sm transition-colors ${
                  nature === cle
                    ? cle === "INCIDENT"
                      ? "bg-error text-on-primary"
                      : "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {cle === "INCIDENT" && <ReportProblemOutlined style={{ fontSize: 14 }} />}
                {libelle}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={enCours || !contenu.trim()}
            onClick={() =>
              agir(async () => {
                await operationsApi.ajouterNote({
                  sujet_type: sujetType,
                  sujet_id: sujetId,
                  nature,
                  contenu,
                });
                setContenu("");
              })
            }
            className="h-8 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
          >
            Ajouter
          </button>
          {nature === "INCIDENT" && (
            <span className="text-label-md text-outline">
              Un incident reste ouvert jusqu&apos;à sa clôture.
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {notes === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : notes.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">Aucune note pour l&apos;instant.</p>
        ) : (
          notes.map((n) => (
            <article
              key={n.id}
              className={`rounded-xl border p-3 ${
                n.nature === "INCIDENT" && n.statut === "OUVERT"
                  ? "border-error/40 bg-error-container/25"
                  : "border-outline-soft bg-surface-container-lowest"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {n.nature === "INCIDENT" ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm ${
                      n.statut === "OUVERT"
                        ? "bg-error-container text-error"
                        : "bg-secondary/15 text-secondary"
                    }`}
                  >
                    <ReportProblemOutlined style={{ fontSize: 12 }} />
                    {n.statut === "OUVERT" ? "Incident ouvert" : "Incident clôturé"}
                  </span>
                ) : (
                  <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                    Note
                  </span>
                )}
                <span className="text-label-md text-on-surface-variant">
                  {n.auteur ?? "—"}
                  {n.cree_le && ` · ${new Date(n.cree_le).toLocaleString("fr-FR")}`}
                </span>
              </div>

              <p className="mt-1.5 whitespace-pre-wrap text-body-sm text-on-surface">
                {n.contenu}
              </p>

              {n.statut === "CLOTURE" && n.resolution && (
                <p className="mt-1.5 rounded-lg bg-surface-container-low px-2.5 py-1.5 text-body-sm text-on-surface-variant">
                  <span className="text-label-md text-outline">Résolution — </span>
                  {n.resolution}
                  {n.cloture_par && (
                    <span className="text-label-md text-outline"> ({n.cloture_par})</span>
                  )}
                </p>
              )}

              {aCloturer === n.id ? (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Qu'a-t-on fait ?"
                    className={CHAMP}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setACloturer(null);
                        setResolution("");
                      }}
                      className="h-8 rounded-lg px-3 text-label-md text-on-surface-variant"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={enCours || !resolution.trim()}
                      onClick={() =>
                        agir(async () => {
                          await operationsApi.cloturerNote(n.id, resolution);
                          setACloturer(null);
                          setResolution("");
                        })
                      }
                      className="h-8 rounded-lg bg-primary px-3 text-label-md font-semibold text-on-primary disabled:opacity-50"
                    >
                      Clôturer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-3">
                  {n.nature === "INCIDENT" && n.statut === "OUVERT" && (
                    <button
                      type="button"
                      onClick={() => setACloturer(n.id)}
                      className="inline-flex items-center gap-1 text-label-md text-primary"
                    >
                      <CheckCircleOutlineOutlined style={{ fontSize: 14 }} />
                      Clôturer
                    </button>
                  )}
                  {n.nature === "INCIDENT" && n.statut === "CLOTURE" && (
                    <button
                      type="button"
                      disabled={enCours}
                      onClick={() => agir(() => operationsApi.rouvrirNote(n.id))}
                      className="text-label-md text-on-surface-variant hover:text-on-surface"
                    >
                      Rouvrir
                    </button>
                  )}
                  {/* Un incident clôturé n'est pas proposé à la suppression :
                      le registre vaut par ce qu'il garde. */}
                  {n.auteur_user_id === moi &&
                    !(n.nature === "INCIDENT" && n.statut === "CLOTURE") && (
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() => agir(() => operationsApi.supprimerNote(n.id))}
                        className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-error"
                      >
                        <DeleteOutlineOutlined style={{ fontSize: 14 }} />
                        Retirer
                      </button>
                    )}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
