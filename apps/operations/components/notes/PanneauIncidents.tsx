"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircleOutlineOutlined, ReportProblemOutlined } from "@mui/icons-material";
import { operationsApi, type NoteOperations, type SujetNote } from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary";

/** Le registre des notes et incidents d'un domaine.
 *
 *  Ouvert par défaut : la question qu'on vient poser ici est « qu'est-ce qui
 *  traîne ? ». L'historique complet reste à un clic, mais l'ouvrir d'emblée
 *  noierait le signal sous ce qui est déjà réglé.
 */
export function PanneauIncidents({
  sujetType,
  titre,
  description,
}: {
  sujetType: SujetNote;
  titre: string;
  description: string;
}) {
  const [filtre, setFiltre] = useState<"OUVERT" | "INCIDENTS" | "TOUT">("OUVERT");
  const [notes, setNotes] = useState<NoteOperations[] | null>(null);
  const [aCloturer, setACloturer] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setNotes(
        await operationsApi.notes({
          sujet_type: sujetType,
          ...(filtre === "OUVERT" ? { nature: "INCIDENT", statut: "OUVERT" } : {}),
          ...(filtre === "INCIDENTS" ? { nature: "INCIDENT" } : {}),
        }),
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Registre indisponible.");
      setNotes([]);
    }
  }, [sujetType, filtre]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const ouverts = useMemo(
    () => (notes ?? []).filter((n) => n.nature === "INCIDENT" && n.statut === "OUVERT").length,
    [notes],
  );

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
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">{titre}</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">{description}</p>
        </div>
        <div className="flex rounded-lg border border-outline-soft p-0.5">
          {([
            ["OUVERT", "Incidents ouverts"],
            ["INCIDENTS", "Tous les incidents"],
            ["TOUT", "Tout"],
          ] as const).map(([cle, libelle]) => (
            <button
              key={cle}
              type="button"
              onClick={() => setFiltre(cle)}
              className={`h-8 rounded-md px-3 text-body-sm transition-colors ${
                filtre === cle
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>

      {erreur && (
        <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {filtre === "OUVERT" && notes !== null && (
        <p className="mt-4 text-body-sm text-on-surface-variant">
          {ouverts === 0
            ? "Rien d'ouvert — tout ce qui a été signalé est clôturé."
            : `${ouverts} incident${ouverts > 1 ? "s" : ""} en attente de traitement.`}
        </p>
      )}

      {notes === null ? (
        <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
      ) : notes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
          <ReportProblemOutlined style={{ fontSize: 28 }} className="text-outline" />
          <p className="mt-2 text-body-md text-on-surface">Rien à signaler.</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Les notes et incidents se posent depuis le détail d&apos;un élément du calendrier.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {notes.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border p-4 ${
                n.nature === "INCIDENT" && n.statut === "OUVERT"
                  ? "border-error/40 bg-error-container/25"
                  : "border-outline-soft bg-surface-container-lowest"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                      {n.statut === "OUVERT" ? "Ouvert" : "Clôturé"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                      Note
                    </span>
                  )}
                  {n.sujet && (
                    <span className="text-body-sm font-medium text-on-surface">
                      {n.sujet.libelle}
                      <span className="ml-1 font-normal text-on-surface-variant">
                        · {new Date(n.sujet.debut).toLocaleString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </span>
                  )}
                </div>
                <span className="text-label-md text-outline">
                  {n.auteur ?? "—"}
                  {n.cree_le && ` · ${new Date(n.cree_le).toLocaleDateString("fr-FR")}`}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-body-sm text-on-surface">{n.contenu}</p>

              {n.statut === "CLOTURE" && n.resolution && (
                <p className="mt-2 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                  <span className="text-label-md text-outline">Résolution — </span>
                  {n.resolution}
                  {n.cloture_par && (
                    <span className="text-label-md text-outline"> ({n.cloture_par})</span>
                  )}
                </p>
              )}

              {aCloturer === n.id ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
                    <span className="text-label-md text-on-surface-variant">
                      Qu&apos;a-t-on fait ?
                    </span>
                    <input
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className={CHAMP}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setACloturer(null);
                      setResolution("");
                    }}
                    className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant"
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
                    className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary disabled:opacity-50"
                  >
                    Clôturer
                  </button>
                </div>
              ) : (
                n.nature === "INCIDENT" && (
                  <div className="mt-2">
                    {n.statut === "OUVERT" ? (
                      <button
                        type="button"
                        onClick={() => setACloturer(n.id)}
                        className="inline-flex items-center gap-1 text-label-md text-primary"
                      >
                        <CheckCircleOutlineOutlined style={{ fontSize: 14 }} />
                        Clôturer
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() => agir(() => operationsApi.rouvrirNote(n.id))}
                        className="text-label-md text-on-surface-variant hover:text-on-surface"
                      >
                        Rouvrir
                      </button>
                    )}
                  </div>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
