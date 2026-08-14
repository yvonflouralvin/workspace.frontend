"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Etudiant, type Inscription, type Promotion } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const TEINTE: Record<string, string> = {
  INSCRIT: "bg-secondary/15 text-secondary",
  ABANDON: "bg-surface-container text-on-surface-variant",
  EXCLU: "bg-error-container/60 text-error",
  DIPLOME: "bg-tertiary/15 text-tertiary",
};

const LIBELLE: Record<string, string> = {
  INSCRIT: "Inscrit",
  ABANDON: "Abandon",
  EXCLU: "Exclu",
  DIPLOME: "Diplômé",
};

/** La fiche d'un étudiant, et son PARCOURS.
 *
 *  Le parcours est la raison d'être du modèle : chaque année y reste, avec sa
 *  promotion et sa fin. L'existant écrasait l'année à chaque rentrée — cette
 *  page n'aurait rien eu à montrer.
 */
export default function EtudiantPage({
  params,
}: {
  params: Promise<{ etudiantId: string }>;
}) {
  const { etudiantId } = use(params);
  const id = Number(etudiantId);
  const { can } = usePermissions();
  const peutGerer = can("academique.etudiants.manage");
  const peutInscrire = can("academique.inscriptions.manage");
  const contexte = useContexte();

  const [etudiant, setEtudiant] = useState<Etudiant | null>(null);
  const [parcours, setParcours] = useState<Inscription[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [choix, setChoix] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [fiche, suite] = await Promise.all([api.etudiant(id), api.parcours(id)]);
      setEtudiant(fiche);
      setParcours(suite);
      if (contexte.etablissement && contexte.annee) {
        setPromotions(
          await api.promotions(contexte.etablissement.id, { annee: contexte.annee.id })
        );
      }
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Fiche introuvable.");
    }
  }, [id, contexte.etablissement, contexte.annee]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function inscrire() {
    if (!choix) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.inscrire(id, Number(choix));
      setChoix("");
      setToast("Inscription enregistrée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[900px] p-4 md:p-8">
        <Link
          href="/etudiants"
          className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Registre
        </Link>

        {erreur && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {!etudiant ? (
          !erreur && <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <>
            <header>
              <h1 className="flex flex-wrap items-center gap-2 font-display text-headline-md text-on-surface">
                {etudiant.nom_complet}
                {etudiant.archive && (
                  <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-md font-normal text-outline">
                    archivé
                  </span>
                )}
              </h1>
              <p className="mt-1 font-mono text-body-sm text-on-surface-variant">
                {etudiant.matricule}
              </p>
            </header>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_300px]">
              <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                <h2 className="text-body-md font-semibold text-on-surface">Parcours</h2>
                <p className="mt-0.5 text-label-md text-outline">
                  Chaque année reste : passer en année supérieure ajoute une ligne, n&apos;en
                  remplace aucune.
                </p>

                {parcours.length === 0 ? (
                  <p className="mt-3 text-body-sm text-on-surface-variant">
                    Aucune inscription pour l&apos;instant.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-hairline">
                    {parcours.map((i) => (
                      <div key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
                        <span className="w-[110px] flex-none text-label-md text-outline">
                          {i.annee_libelle}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body-sm text-on-surface">
                            {i.promotion_libelle}
                          </span>
                          {i.motif && (
                            <span className="block truncate text-label-md text-on-surface-variant">
                              {i.motif}
                            </span>
                          )}
                        </span>
                        <span
                          className={`flex-none rounded-full px-2 py-0.5 text-label-md ${TEINTE[i.statut]}`}
                        >
                          {LIBELLE[i.statut]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {peutInscrire && !etudiant.archive && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
                    <select
                      aria-label="Promotion"
                      className={CHAMP}
                      value={choix}
                      onChange={(e) => setChoix(e.target.value)}
                    >
                      <option value="">
                        {contexte.annee
                          ? `Inscrire en ${contexte.annee.libelle}…`
                          : "Aucune année de travail"}
                      </option>
                      {promotions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.libelle}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !choix}
                      onClick={inscrire}
                      className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                    >
                      Inscrire
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                <h2 className="text-body-md font-semibold text-on-surface">Identité</h2>
                <dl className="mt-2 space-y-1 text-body-sm">
                  {[
                    ["Sexe", etudiant.sexe === "M" ? "Masculin" : etudiant.sexe === "F" ? "Féminin" : "—"],
                    ["Téléphone", etudiant.telephone ?? "—"],
                    ["Courriel", etudiant.email ?? "—"],
                    ["Compte", etudiant.user_id ? `#${etudiant.user_id}` : "aucun"],
                  ].map(([libelle, valeur]) => (
                    <div key={libelle} className="flex gap-2">
                      <dt className="w-[90px] flex-none text-on-surface-variant">{libelle}</dt>
                      <dd className="min-w-0 flex-1 text-on-surface">{valeur}</dd>
                    </div>
                  ))}
                </dl>

                {peutGerer && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        await api.modifierEtudiant(id, { archive: !etudiant.archive });
                        setToast(etudiant.archive ? "Fiche réactivée." : "Fiche archivée.");
                        await charger();
                      } catch (e) {
                        setErreur(e instanceof Error ? e.message : "Action impossible.");
                      }
                    }}
                    className="mt-3 h-9 w-full rounded-lg border border-outline-soft text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
                  >
                    {etudiant.archive ? "Réactiver la fiche" : "Archiver la fiche"}
                  </button>
                )}
                {peutGerer && (
                  <p className="mt-2 text-label-md text-outline">
                    On n&apos;efface pas une personne : archiver la sort des listes sans
                    toucher à son parcours.
                  </p>
                )}
              </section>
            </div>
          </>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
