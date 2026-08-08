"use client";

import { useCallback, useEffect, useState } from "react";
import { BoltOutlined, StopOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Toast } from "@repo/ui/Toast";
import { FilDeNotes } from "@/components/notes/FilDeNotes";
import { operationsApi, type UsageGroupe } from "@/lib/operations-api";

/** Le registre des utilisations. Les groupes en marche d'abord — c'est ce
 *  qu'on vient voir, et c'est la seule chose sur laquelle on peut encore agir. */
export function PanneauUsages() {
  const { can } = usePermissions();
  const peutGerer = can("operations.groupes.manage");

  const [usages, setUsages] = useState<UsageGroupe[] | null>(null);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setUsages(await operationsApi.usagesGroupe());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setUsages([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const enCoursDeMarche = (usages ?? []).filter((u) => u.en_cours);
  const termines = (usages ?? []).filter((u) => !u.en_cours);

  async function arreter(u: UsageGroupe) {
    setEnCours(true);
    try {
      await operationsApi.arreterGroupe(u.id);
      setToast(`« ${u.groupe} » arrêté.`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Arrêt impossible.");
    } finally {
      setEnCours(false);
    }
  }

  const Ligne = ({ u }: { u: UsageGroupe }) => (
    <article
      className={`rounded-2xl border p-4 ${
        u.en_cours ? "border-secondary/40 bg-secondary/5" : "border-outline-soft bg-surface-container-lowest"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-body-md font-medium text-on-surface">
            {u.en_cours && <BoltOutlined style={{ fontSize: 16 }} className="text-secondary" />}
            {u.groupe}
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {new Date(u.debut).toLocaleString("fr-FR")}
            {u.fin ? ` → ${new Date(u.fin).toLocaleString("fr-FR")}` : " → en cours"}
            {" · "}
            <span className="tabular-nums">{u.heures} h</span>
          </p>
          {u.motif && <p className="mt-1 text-body-sm text-on-surface-variant">{u.motif}</p>}
          <p className="mt-1 text-label-md text-outline">
            Démarré par {u.demarre_par ?? "—"}
            {u.arrete_par && ` · arrêté par ${u.arrete_par}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {u.en_cours && peutGerer && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => void arreter(u)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-error px-3 text-label-md font-semibold text-on-primary disabled:opacity-50"
            >
              <StopOutlined style={{ fontSize: 15 }} />
              Arrêter
            </button>
          )}
          <button
            type="button"
            onClick={() => setOuvert(ouvert === u.id ? null : u.id)}
            className="text-label-md text-primary"
          >
            {ouvert === u.id ? "Masquer les notes" : "Notes & incidents"}
          </button>
        </div>
      </div>

      {ouvert === u.id && (
        <div className="mt-3 border-t border-outline-soft pt-3">
          <FilDeNotes sujetType="USAGE_GROUPE" sujetId={u.id} compact />
        </div>
      )}
    </article>
  );

  return (
    <>
      <div className="p-4 md:p-8">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Utilisations</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Chaque démarrage et son arrêt. Un groupe en marche n&apos;a pas de fin : c&apos;est
            ce qui permet de savoir, à tout instant, lequel tourne.
          </p>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {usages === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : usages.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <p className="text-body-md text-on-surface">Aucune utilisation enregistrée.</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Démarrez un groupe depuis la vue « Groupes ».
            </p>
          </div>
        ) : (
          <>
            {enCoursDeMarche.length > 0 && (
              <section className="mt-5">
                <h2 className="text-headline-sm text-on-surface">En marche</h2>
                <div className="mt-2 flex flex-col gap-2">
                  {enCoursDeMarche.map((u) => <Ligne key={u.id} u={u} />)}
                </div>
              </section>
            )}
            <section className="mt-6">
              <h2 className="text-headline-sm text-on-surface">Historique</h2>
              {termines.length === 0 ? (
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Rien de terminé pour l&apos;instant.
                </p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  {termines.map((u) => <Ligne key={u.id} u={u} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
