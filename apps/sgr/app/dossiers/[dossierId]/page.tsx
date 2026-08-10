"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, CheckCircleOutlined, DescriptionOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import { FriseEtapes } from "@/components/FriseEtapes";
import { sgrApi, type Dossier } from "@/app/lib/api";

const ACTION: Record<string, string> = {
  RECU: "Constater la réception du dossier physique",
  ANALYSE: "Consigner l'analyse technique",
  VALIDE: "Valider le dossier",
  DECIDE: "Rendre la décision finale",
};

/** Le dossier vu par l'instruction.
 *
 *  Trois choses au même endroit, parce qu'on ne décide pas sans les trois : ce
 *  qui a été déposé, où en est le dossier, et ce que les précédents ont écrit.
 */
export default function DossierAdminPage({
  params,
}: {
  params: Promise<{ dossierId: string }>;
}) {
  const { dossierId } = use(params);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [decision, setDecision] = useState("FAVORABLE");

  const charger = useCallback(async () => {
    try {
      setDossier(await sgrApi.dossier(Number(dossierId)));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Dossier introuvable.");
    }
  }, [dossierId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function avancer() {
    if (!dossier?.prochaine_etape) return;
    setBusy(true);
    setErreur(null);
    try {
      await sgrApi.avancer(dossier.id, {
        vers: dossier.prochaine_etape,
        commentaire: commentaire.trim() || undefined,
        decision: dossier.prochaine_etape === "DECIDE" ? decision : undefined,
      });
      setCommentaire("");
      setToast("Dossier mis à jour.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <Link
          href="/dossiers"
          className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Dossiers
        </Link>

        {erreur && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {!dossier ? (
          !erreur && <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <>
            <header>
              <h1 className="font-display text-headline-md text-on-surface">
                {dossier.nom} {dossier.prenom}
              </h1>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {dossier.type_libelle} · {dossier.etape_libelle}
                {dossier.reference && ` · ${dossier.reference}`}
              </p>
            </header>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                  <h2 className="text-body-md font-semibold text-on-surface">Le candidat</h2>
                  <dl className="mt-2 space-y-1 text-body-sm">
                    {[
                      ["Courriel", dossier.email],
                      ["Téléphone", dossier.telephone ?? "—"],
                      ["Faculté", dossier.faculte ?? "—"],
                      ["Département", dossier.departement ?? "—"],
                      ["Sujet", dossier.sujet ?? "—"],
                      ["Promoteur", dossier.promoteur ?? "—"],
                      ["Comité d'encadrement", dossier.comite ?? "—"],
                    ].map(([libelle, valeur]) => (
                      <div key={libelle} className="flex gap-3">
                        <dt className="w-[150px] flex-none text-on-surface-variant">{libelle}</dt>
                        <dd className="min-w-0 flex-1 text-on-surface">{valeur}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-body-md font-semibold text-on-surface">Pièces déposées</h2>
                    <span className="text-label-md text-outline">
                      {dossier.deposees.length} fichier{dossier.deposees.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-2 divide-y divide-hairline">
                    {dossier.pieces.map((piece) => {
                      const fichiers = dossier.deposees.filter((d) => d.cle_piece === piece.cle);
                      return (
                        <div key={piece.cle} className="flex items-start gap-2 py-2">
                          <span className="mt-0.5 flex-none">
                            {fichiers.length > 0 ? (
                              <CheckCircleOutlined
                                style={{ fontSize: 16 }}
                                className="text-secondary"
                              />
                            ) : (
                              <DescriptionOutlined
                                style={{ fontSize: 16 }}
                                className="text-outline-variant"
                              />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-body-sm text-on-surface">
                              {piece.libelle}
                              {piece.obligatoire && <span className="text-error"> *</span>}
                            </span>
                            {fichiers.map((f) => (
                              <a
                                key={f.id}
                                href={sgrApi.fichierUrl(dossier.id, f.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate text-label-md text-primary hover:underline"
                              >
                                {f.nom_fichier}
                              </a>
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                  <h2 className="mb-3 text-body-md font-semibold text-on-surface">Instruction</h2>
                  <FriseEtapes etapes={dossier.etapes} />

                  {dossier.peut_avancer && dossier.prochaine_etape && (
                    <div className="border-t border-outline-soft pt-3">
                      {dossier.prochaine_etape === "DECIDE" && (
                        <select
                          aria-label="Décision"
                          className="mb-2 h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
                          value={decision}
                          onChange={(e) => setDecision(e.target.value)}
                        >
                          <option value="FAVORABLE">Avis favorable</option>
                          <option value="DEFAVORABLE">Avis défavorable</option>
                        </select>
                      )}
                      <textarea
                        rows={3}
                        aria-label="Commentaire"
                        className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary"
                        placeholder={
                          dossier.prochaine_etape === "DECIDE"
                            ? "Motif — obligatoire pour un avis défavorable"
                            : "Commentaire (facultatif)"
                        }
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={avancer}
                        className="mt-2 h-9 w-full rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                      >
                        {ACTION[dossier.prochaine_etape] ?? "Faire avancer"}
                      </button>
                    </div>
                  )}
                  {!dossier.peut_avancer && dossier.prochaine_etape && (
                    <p className="border-t border-outline-soft pt-3 text-label-md text-outline">
                      L&apos;étape suivante — {ACTION[dossier.prochaine_etape]} — demande un droit
                      que vous n&apos;avez pas.
                    </p>
                  )}
                </section>

                <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                  <h2 className="text-body-md font-semibold text-on-surface">Journal</h2>
                  {dossier.transitions.length === 0 ? (
                    <p className="mt-2 text-label-md text-outline">Rien encore.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {dossier.transitions.map((t, i) => (
                        <li key={i} className="text-label-md">
                          <span className="text-on-surface">
                            {t.par_nom ?? (t.par_user_id ? `#${t.par_user_id}` : "—")}
                          </span>
                          <span className="text-on-surface-variant"> · {t.vers} · </span>
                          <span className="text-outline">
                            {new Date(t.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {t.commentaire && (
                            <span className="block text-on-surface-variant">{t.commentaire}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          </>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
