"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  CheckCircleOutlined,
  DeleteOutlineOutlined,
  DescriptionOutlined,
  UploadFileOutlined,
  WorkspacePremiumOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import { FriseEtapes } from "@/components/FriseEtapes";
import { sgrApi, type Dossier, type TypeDossier } from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** L'espace du candidat : constituer, envoyer, suivre.
 *
 *  Un seul écran, parce qu'un candidat n'a qu'une chose à faire à la fois :
 *  tant que le dossier n'est pas parti, il le remplit ; une fois parti, il le
 *  suit. Séparer les deux en deux pages aurait obligé à naviguer pour savoir
 *  laquelle le concerne.
 */
export default function MonDossierPage() {
  const [dossiers, setDossiers] = useState<Dossier[] | null>(null);
  const [types, setTypes] = useState<TypeDossier[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creation, setCreation] = useState(false);
  const [choix, setChoix] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [faculte, setFaculte] = useState("");
  const [departement, setDepartement] = useState("");

  const charger = useCallback(async () => {
    try {
      const [mes, cat] = await Promise.all([sgrApi.mesDossiers(), sgrApi.types()]);
      setDossiers(mes);
      setTypes(cat);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setDossiers([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function creer() {
    if (!choix || !nom.trim() || !prenom.trim()) return;
    setBusy(true);
    try {
      await sgrApi.creerDossier({
        type_dossier: choix,
        nom: nom.trim(),
        prenom: prenom.trim(),
        faculte: faculte || null,
        departement: departement || null,
      });
      setCreation(false);
      setToast("Dossier ouvert. Déposez vos pièces.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function deposer(dossier: Dossier, cle: string, fichier: File) {
    setBusy(true);
    setErreur(null);
    try {
      await sgrApi.deposer(dossier.id, cle, fichier);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Dépôt impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function soumettre(dossier: Dossier) {
    setBusy(true);
    setErreur(null);
    try {
      await sgrApi.soumettre(dossier.id);
      setToast("Dossier envoyé. Imprimez votre certificat et déposez-le à votre faculté.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  const ouverts = types.filter((t) => t.ouverte);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">Mon dossier</h1>
            <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
              Déposez vos pièces, envoyez votre dossier, puis suivez son instruction.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreation((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouvelle demande
          </button>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {creation && (
          <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className="text-label-sm uppercase text-outline">Type de demande</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {types.map((t) => (
                <button
                  key={t.cle}
                  type="button"
                  disabled={!t.ouverte}
                  onClick={() => setChoix(t.cle)}
                  className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-50 ${
                    choix === t.cle
                      ? "border-primary bg-primary/5"
                      : "border-outline-soft hover:bg-surface-container-low"
                  }`}
                >
                  <span className="block text-body-sm font-medium text-on-surface">{t.libelle}</span>
                  <span className="mt-0.5 block text-label-md text-on-surface-variant">
                    {t.ouverte
                      ? t.description
                      : (t.message_fermeture ?? "Temporairement fermé")}
                  </span>
                </button>
              ))}
            </div>

            {ouverts.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input className={CHAMP} placeholder="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} />
                <input className={CHAMP} placeholder="Prénom *" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                <input className={CHAMP} placeholder="Faculté" value={faculte} onChange={(e) => setFaculte(e.target.value)} />
                <input className={CHAMP} placeholder="Département" value={departement} onChange={(e) => setDepartement(e.target.value)} />
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy || !choix || !nom.trim() || !prenom.trim()}
                onClick={creer}
                className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                Ouvrir le dossier
              </button>
              <button
                type="button"
                onClick={() => setCreation(false)}
                className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                Annuler
              </button>
            </div>
          </section>
        )}

        {dossiers === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : dossiers.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <DescriptionOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-md text-on-surface">Aucun dossier pour l&apos;instant.</p>
            <p className="mx-auto mt-1 max-w-[52ch] text-body-sm text-on-surface-variant">
              « Nouvelle demande » ouvre un dossier et affiche la liste des pièces attendues.
            </p>
          </div>
        ) : (
          dossiers.map((dossier) => (
            <section key={dossier.id} className="mt-6 space-y-4">
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-headline-sm text-on-surface">
                      {dossier.type_libelle}
                    </h2>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">
                      {dossier.etape_libelle}
                      {dossier.reference && ` · référence ${dossier.reference}`}
                    </p>
                  </div>
                  {dossier.reference && (
                    <Link
                      href={`/mon-dossier/${dossier.id}/certificat`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
                    >
                      <WorkspacePremiumOutlined style={{ fontSize: 17 }} />
                      Certificat
                    </Link>
                  )}
                </div>

                {dossier.decision && (
                  <p
                    className={`mt-3 rounded-lg px-3 py-2 text-body-sm ${
                      dossier.decision === "FAVORABLE"
                        ? "bg-secondary/15 text-secondary"
                        : "bg-error-container/50 text-error"
                    }`}
                  >
                    Décision : {dossier.decision === "FAVORABLE" ? "favorable" : "défavorable"}
                    {dossier.motif_decision && ` — ${dossier.motif_decision}`}
                  </p>
                )}

                <div className="mt-4">
                  <FriseEtapes etapes={dossier.etapes} />
                </div>
              </div>

              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-body-md font-semibold text-on-surface">Pièces du dossier</h3>
                  <span className="text-label-md text-outline">
                    {dossier.pieces.filter((p) => p.obligatoire).length - dossier.manquantes.length}
                    /{dossier.pieces.filter((p) => p.obligatoire).length} pièces obligatoires
                  </span>
                </div>

                <div className="mt-3 divide-y divide-hairline">
                  {dossier.pieces.map((piece) => {
                    const fichiers = dossier.deposees.filter((d) => d.cle_piece === piece.cle);
                    return (
                      <div key={piece.cle} className="py-3">
                        <div className="flex flex-wrap items-start gap-3">
                          <span className="mt-0.5 flex-none">
                            {fichiers.length > 0 ? (
                              <CheckCircleOutlined style={{ fontSize: 18 }} className="text-secondary" />
                            ) : (
                              <UploadFileOutlined
                                style={{ fontSize: 18 }}
                                className={piece.obligatoire ? "text-outline" : "text-outline-variant"}
                              />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-body-sm text-on-surface">
                              {piece.libelle}
                              {piece.obligatoire && <span className="text-error"> *</span>}
                            </span>
                            {fichiers.map((f) => (
                              <span key={f.id} className="mt-1 flex items-center gap-2">
                                <a
                                  href={sgrApi.fichierUrl(dossier.id, f.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="truncate text-label-md text-primary hover:underline"
                                >
                                  {f.nom_fichier}
                                </a>
                                {dossier.peut_deposer && (
                                  <button
                                    type="button"
                                    aria-label={`Retirer ${f.nom_fichier}`}
                                    disabled={busy}
                                    onClick={async () => {
                                      await sgrApi.retirerPiece(dossier.id, f.id);
                                      await charger();
                                    }}
                                    className="text-outline transition-colors hover:text-error"
                                  >
                                    <DeleteOutlineOutlined style={{ fontSize: 15 }} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </span>
                          {dossier.peut_deposer && (
                            <label className="flex-none cursor-pointer rounded-lg border border-outline-soft px-3 py-1.5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low">
                              {fichiers.length > 0 ? "Ajouter" : "Déposer"}
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                disabled={busy}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void deposer(dossier, piece.cle, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {dossier.peut_deposer && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-outline-soft pt-4">
                    <button
                      type="button"
                      disabled={busy || !dossier.peut_soumettre}
                      onClick={() => soumettre(dossier)}
                      className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                    >
                      Envoyer le dossier
                    </button>
                    <span className="text-label-md text-outline">
                      {dossier.peut_soumettre
                        ? "Une fois envoyé, le dossier est figé : le certificat en engage le contenu."
                        : `Il manque ${dossier.manquantes.length} pièce${dossier.manquantes.length > 1 ? "s" : ""} obligatoire${dossier.manquantes.length > 1 ? "s" : ""}.`}
                    </span>
                  </div>
                )}
              </div>
            </section>
          ))
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
