"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, WorkOutlineOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/contexte";
import { academia, api, type EtudiantAcademique, type Stage } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const TEINTE: Record<string, string> = {
  DECLARE: "bg-surface-container text-on-surface-variant",
  VALIDE: "bg-secondary/15 text-secondary",
  REFUSE: "bg-error-container/60 text-error",
};

/** Les stages — pédagogiques ou en entreprise.
 *
 *  La cote n'apparaît qu'une fois le stage validé : l'afficher avant ferait
 *  croire qu'on peut coter un stage que personne n'a encore examiné.
 */
export default function StagesPage() {
  const { can } = usePermissions();
  const peutInstruire = can("isp.travaux.instruire");
  const peutDeposer = can("isp.travaux.deposer");
  const contexte = useContexte();

  const [stages, setStages] = useState<Stage[] | null>(null);
  const [etudiants, setEtudiants] = useState<EtudiantAcademique[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({
    etudiant_id: "",
    type_stage: "PEDAGOGIQUE",
    institution: "",
  });
  const [cotes, setCotes] = useState<Record<number, string>>({});
  const [motifs, setMotifs] = useState<Record<number, string>>({});

  const unite = contexte.unite;

  const charger = useCallback(async () => {
    if (!unite) return;
    try {
      const [liste, etus] = await Promise.all([
        api.stages({ unite: unite.id }),
        academia.etudiantsDeLUnite(unite.id).catch(() => ({ items: [], total: 0 })),
      ]);
      setStages(liste);
      setEtudiants(etus.items);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setStages([]);
    }
  }, [unite]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const nom = (id: number) =>
    etudiants.find((e) => e.id === id)?.nom_complet ?? `Étudiant #${id}`;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Stages</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Un stage se déclare, s&apos;instruit, puis se cote — dans cet ordre.
        </p>

        <div className="mt-4">
          <BarreContexte
            unites={contexte.unites}
            unite={unite}
            onUnite={contexte.setUnite}
            annee={contexte.annee}
          />
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        {peutDeposer && unite && (
          <section className="mb-4 grid gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:grid-cols-4">
            <select
              aria-label="Étudiant"
              className={CHAMP}
              value={nouveau.etudiant_id}
              onChange={(e) => setNouveau({ ...nouveau, etudiant_id: e.target.value })}
            >
              <option value="">Étudiant…</option>
              {etudiants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom_complet}
                </option>
              ))}
            </select>
            <select
              aria-label="Type de stage"
              className={CHAMP}
              value={nouveau.type_stage}
              onChange={(e) => setNouveau({ ...nouveau, type_stage: e.target.value })}
            >
              <option value="PEDAGOGIQUE">Stage pédagogique</option>
              <option value="ENTREPRISE">Stage en entreprise</option>
            </select>
            <input
              className={CHAMP}
              placeholder="Institution d'accueil"
              value={nouveau.institution}
              onChange={(e) => setNouveau({ ...nouveau, institution: e.target.value })}
            />
            <button
              type="button"
              disabled={!nouveau.etudiant_id || !nouveau.institution.trim()}
              onClick={async () => {
                try {
                  await api.declarerStage({
                    etudiant_id: Number(nouveau.etudiant_id),
                    type_stage: nouveau.type_stage,
                    institution: nouveau.institution.trim(),
                  });
                  setNouveau({ etudiant_id: "", type_stage: "PEDAGOGIQUE", institution: "" });
                  setToast("Stage déclaré.");
                  await charger();
                } catch (e) {
                  setErreur(e instanceof Error ? e.message : "Déclaration impossible.");
                }
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Déclarer
            </button>
          </section>
        )}

        {stages === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : stages.length === 0 ? (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <WorkOutlineOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Aucun stage dans ce département.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body-md font-medium text-on-surface">
                      {nom(s.etudiant_id)}
                    </p>
                    <p className="text-label-md text-outline">
                      {s.type_stage === "PEDAGOGIQUE" ? "Pédagogique" : "Entreprise"} ·{" "}
                      {s.institution}
                      {s.encadreur && ` · encadré par ${s.encadreur}`}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    {s.cote !== null && (
                      <span className="rounded-full bg-tertiary/15 px-2 py-0.5 text-label-md text-tertiary">
                        {s.cote}/20
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-label-md ${TEINTE[s.statut]}`}>
                      {s.statut === "DECLARE"
                        ? "Déclaré"
                        : s.statut === "VALIDE"
                          ? "Validé"
                          : "Refusé"}
                    </span>
                  </div>
                </div>

                {s.motif && (
                  <p className="mt-2 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                    {s.motif}
                  </p>
                )}

                {peutInstruire && s.statut === "DECLARE" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.deciderStage(s.id, "VALIDE");
                          setToast("Stage validé.");
                          await charger();
                        } catch (e) {
                          setErreur(e instanceof Error ? e.message : "Action impossible.");
                        }
                      }}
                      className="h-8 rounded-lg bg-primary px-3 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
                    >
                      Valider
                    </button>
                    <input
                      className={`${CHAMP} min-w-[220px] flex-1`}
                      placeholder="Motif du refus"
                      value={motifs[s.id] ?? ""}
                      onChange={(e) => setMotifs({ ...motifs, [s.id]: e.target.value })}
                    />
                    <button
                      type="button"
                      disabled={!(motifs[s.id] ?? "").trim()}
                      onClick={async () => {
                        try {
                          await api.deciderStage(s.id, "REFUSE", motifs[s.id]);
                          setToast("Stage refusé.");
                          await charger();
                        } catch (e) {
                          setErreur(e instanceof Error ? e.message : "Action impossible.");
                        }
                      }}
                      className="h-8 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:text-error disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </div>
                )}

                {peutInstruire && s.statut === "VALIDE" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.5}
                      aria-label={`Cote du stage ${s.id}`}
                      className={`${CHAMP} w-[120px]`}
                      placeholder="Cote /20"
                      value={cotes[s.id] ?? ""}
                      onChange={(e) => setCotes({ ...cotes, [s.id]: e.target.value })}
                    />
                    <button
                      type="button"
                      disabled={!cotes[s.id]}
                      onClick={async () => {
                        try {
                          await api.coterStage(s.id, Number(cotes[s.id]));
                          setToast("Cote enregistrée.");
                          await charger();
                        } catch (e) {
                          setErreur(e instanceof Error ? e.message : "Action impossible.");
                        }
                      }}
                      className="h-8 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
                    >
                      Enregistrer la cote
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
