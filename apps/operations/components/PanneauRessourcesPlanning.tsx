"use client";

import { useCallback, useEffect, useState } from "react";
import { TuneOutlined } from "@mui/icons-material";
import { operationsApi, type Planning, type Ressource } from "@/lib/operations-api";

/** Les ressources qu'un planning a le droit d'employer.
 *
 *  La restriction se posait à la création et nulle part ailleurs : un planning
 *  ouvert par erreur à tout restait ouvert à tout, et une ressource ajoutée
 *  après coup n'entrait jamais dans un planning restreint. Elle se règle donc
 *  ici, sur le planning lui-même.
 */
export function PanneauRessourcesPlanning({
  planning,
  onChange,
}: {
  planning: Planning;
  onChange: () => void;
}) {
  const [ressources, setRessources] = useState<Ressource[] | null>(null);
  const [restreint, setRestreint] = useState(planning.ressource_ids.length > 0);
  const [choisies, setChoisies] = useState<number[]>(planning.ressource_ids);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await operationsApi.ressources({ type: planning.type, actif: true, page: 1 });
        setRessources(r.items);
      } catch {
        setRessources([]);
      }
    })();
  }, [planning.type]);

  const modifie =
    restreint !== planning.ressource_ids.length > 0 ||
    choisies.length !== planning.ressource_ids.length ||
    choisies.some((i) => !planning.ressource_ids.includes(i));

  const enregistrer = useCallback(async () => {
    setEnCours(true);
    setErreur(null);
    try {
      await operationsApi.modifierPlanning(planning.id, {
        ressource_ids: restreint ? choisies : [],
      });
      setMessage(
        restreint
          ? `${choisies.length} ressource(s) autorisée(s).`
          : "Toutes les ressources de cette nature sont autorisées.",
      );
      onChange();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnCours(false);
    }
  }, [planning.id, restreint, choisies, onChange]);

  return (
    <section className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <h2 className="flex items-center gap-1.5 text-body-md font-medium text-on-surface">
        <TuneOutlined style={{ fontSize: 17 }} className="text-on-surface-variant" />
        Ressources employées
      </h2>
      <p className="mt-0.5 max-w-[62ch] text-body-sm text-on-surface-variant">
        Ce planning peut n&apos;accepter que certaines ressources. La restriction ne juge pas,
        elle définit : une affectation hors liste est refusée comme le serait une date hors
        période.
      </p>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        {([
          [false, "N'importe quelle ressource de cette nature"],
          [true, "Seulement les ressources que je désigne"],
        ] as const).map(([valeur, libelle]) => (
          <label key={String(valeur)} className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="restriction-planning"
              checked={restreint === valeur}
              onChange={() => {
                setRestreint(valeur);
                setMessage(null);
              }}
              className="mt-0.5"
            />
            <span className="text-body-sm text-on-surface">{libelle}</span>
          </label>
        ))}
      </div>

      {restreint && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-outline-soft p-2">
          {ressources === null ? (
            <p className="text-label-md text-on-surface-variant">Chargement…</p>
          ) : ressources.length === 0 ? (
            <p className="text-label-md text-on-surface-variant">
              Aucune ressource de cette nature. Créez-en depuis « Ressources ».
            </p>
          ) : (
            ressources.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                <input
                  type="checkbox"
                  checked={choisies.includes(r.id)}
                  onChange={(e) => {
                    setChoisies(
                      e.target.checked
                        ? [...choisies, r.id]
                        : choisies.filter((i) => i !== r.id),
                    );
                    setMessage(null);
                  }}
                />
                <span className="text-body-sm text-on-surface">{r.nom_affiche}</span>
              </label>
            ))
          )}
        </div>
      )}

      {restreint && choisies.length === 0 && (
        <p className="mt-1 text-label-md text-error">
          Aucune ressource cochée : ce planning n&apos;acceptera aucune affectation.
        </p>
      )}

      {/* Les affectations déjà posées ne sont PAS revérifiées : restreindre
          aujourd'hui ne doit pas invalider ce qui a été décidé hier. */}
      {restreint && planning.affectations_count > 0 && (
        <p className="mt-1 text-label-md text-outline">
          Les {planning.affectations_count} affectation(s) déjà posées restent en place, même
          si leur ressource sort de la liste.
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={enCours || !modifie}
          onClick={enregistrer}
          className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
        >
          {enCours ? "…" : "Enregistrer"}
        </button>
        {message && <span className="text-label-md text-secondary">{message}</span>}
      </div>
    </section>
  );
}
