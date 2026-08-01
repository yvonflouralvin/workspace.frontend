"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AddOutlined,
  ArrowBackOutlined,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  ContentCopyOutlined,
  DeleteOutlineOutlined,
  InsightsOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { useSessionStore } from "@repo/auth/store/session.store";
import { listMembers } from "@/app/lib/api";
import type { Member } from "@/app/lib/types";
import {
  ACCES_LABELS,
  STATUT_LABELS,
  TYPES_QUESTION,
  formsApi,
  type Formulaire,
  type QuestionEcrite,
  type TypeQuestion,
} from "@/app/lib/forms-api";

const CHAMP =
  "h-9 w-full px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

function vierge(): QuestionEcrite {
  return {
    type: "TEXTE_COURT",
    libelle: "",
    aide: null,
    obligatoire: false,
    options: [],
    config: {},
  };
}

export default function EditeurFormulairePage() {
  const { formId } = useParams<{ formId: string }>();
  const router = useRouter();
  const id = Number(formId);
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);

  const [forme, setForme] = useState<Formulaire | null>(null);
  const [questions, setQuestions] = useState<QuestionEcrite[]>([]);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [membres, setMembres] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState(false);
  const [introuvable, setIntrouvable] = useState(false);

  const charger = useCallback(async () => {
    try {
      const lu = await formsApi.get(id);
      setForme(lu);
      setTitre(lu.titre);
      setDescription(lu.description ?? "");
      // Les questions retirées ne reviennent pas dans l'éditeur : elles ne
      // vivent plus que dans les résultats.
      setQuestions(
        lu.questions
          .filter((q) => !q.supprimee)
          .map((q) => ({
            id: q.id,
            type: q.type,
            libelle: q.libelle,
            aide: q.aide,
            obligatoire: q.obligatoire,
            options: q.options,
            config: q.config,
          }))
      );
    } catch {
      setIntrouvable(true);
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (!workspaceId) return;
    listMembers(Number(workspaceId), { limit: 200 })
      .then((r) => setMembres(r.members))
      .catch(() => {});
  }, [workspaceId]);

  async function appliquer(
    corps: Parameters<typeof formsApi.modifier>[1],
    message: string
  ) {
    setBusy(true);
    setErreur(null);
    try {
      const lu = await formsApi.modifier(id, corps);
      setForme(lu);
      setToast(message);
      return lu;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function enregistrer() {
    await appliquer(
      {
        titre: titre.trim(),
        description: description.trim() || null,
        questions: questions.map((q) => ({
          ...q,
          libelle: q.libelle.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
        })),
      },
      "Formulaire enregistré."
    );
    await charger();
  }

  function modifierQuestion(index: number, patch: Partial<QuestionEcrite>) {
    setQuestions((liste) => liste.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function deplacer(index: number, sens: number) {
    setQuestions((liste) => {
      const cible = index + sens;
      if (cible < 0 || cible >= liste.length) return liste;
      const copie = [...liste];
      [copie[index], copie[cible]] = [copie[cible]!, copie[index]!];
      return copie;
    });
  }

  if (introuvable) {
    return (
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-4">
        <Retour />
        <p className="text-body-md text-error">Formulaire introuvable.</p>
      </div>
    );
  }
  if (!forme) {
    return <p className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</p>;
  }
  if (!forme.peut_modifier) {
    return (
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-4">
        <Retour />
        <p className="text-body-md text-on-surface-variant">
          Vous consultez ce formulaire sans pouvoir le modifier.
        </p>
        {forme.peut_voir_resultats && (
          <Link href={`/forms/${id}/resultats`} className="text-body-sm text-primary">
            Voir les résultats
          </Link>
        )}
      </div>
    );
  }

  const lienPublic =
    typeof window !== "undefined" ? `${window.location.origin}/f/${forme.jeton_public}` : "";

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <Retour />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 text-label-md text-outline">
            {STATUT_LABELS[forme.statut]}
            <span aria-hidden>·</span>
            {forme.nb_soumissions} réponse{forme.nb_soumissions > 1 ? "s" : ""}
          </span>
          <input
            aria-label="Titre du formulaire"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="mt-0.5 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
          />
        </div>
        <div className="flex flex-none items-center gap-2 pt-4">
          <Link
            href={`/forms/${id}/repondre`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <VisibilityOutlined style={{ fontSize: 16 }} />
            Aperçu
          </Link>
          <Link
            href={`/forms/${id}/resultats`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <InsightsOutlined style={{ fontSize: 16 }} />
            Résultats
          </Link>
          <button
            type="button"
            disabled={busy || !titre.trim()}
            onClick={enregistrer}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div>
          <label className={LABEL}>Description</label>
          <textarea
            rows={2}
            className="w-full resize-y rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="À quoi sert ce formulaire, qui doit y répondre…"
          />

          <p className={`${LABEL} mt-6`}>Questions</p>
          <div className="space-y-3">
            {questions.length === 0 && (
              <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-center text-body-sm text-on-surface-variant">
                Aucune question. Un formulaire sans question ne peut pas être publié.
              </p>
            )}
            {questions.map((question, index) => {
              const type = TYPES_QUESTION.find((t) => t.cle === question.type)!;
              return (
                <div
                  key={question.id ?? `n-${index}`}
                  className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <input
                      aria-label={`Intitulé de la question ${index + 1}`}
                      className={`${CHAMP} flex-1 min-w-[220px]`}
                      value={question.libelle}
                      onChange={(e) => modifierQuestion(index, { libelle: e.target.value })}
                      placeholder="Votre question…"
                    />
                    <select
                      aria-label={`Type de la question ${index + 1}`}
                      className={`${CHAMP} w-[170px]`}
                      value={question.type}
                      onChange={(e) => {
                        const nouveau = e.target.value as TypeQuestion;
                        const cible = TYPES_QUESTION.find((t) => t.cle === nouveau)!;
                        modifierQuestion(index, {
                          type: nouveau,
                          // Changer de type efface les options quand le nouveau
                          // n'en accepte pas : les garder ferait refuser
                          // l'enregistrement sans que rien ne se voie à l'écran.
                          options: cible.aOptions ? question.options : [],
                          config: nouveau === "ECHELLE" ? { min: 1, max: 5 } : question.config,
                        });
                      }}
                    >
                      {TYPES_QUESTION.map((t) => (
                        <option key={t.cle} value={t.cle}>
                          {t.libelle}
                        </option>
                      ))}
                    </select>
                    <span className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Monter la question"
                        onClick={() => deplacer(index, -1)}
                        className="rounded-md p-1.5 text-outline hover:text-primary hover:bg-surface-container-low transition-colors"
                      >
                        <ArrowUpwardOutlined style={{ fontSize: 16 }} />
                      </button>
                      <button
                        type="button"
                        aria-label="Descendre la question"
                        onClick={() => deplacer(index, 1)}
                        className="rounded-md p-1.5 text-outline hover:text-primary hover:bg-surface-container-low transition-colors"
                      >
                        <ArrowDownwardOutlined style={{ fontSize: 16 }} />
                      </button>
                      <button
                        type="button"
                        aria-label="Retirer la question"
                        onClick={() => setQuestions((l) => l.filter((_, i) => i !== index))}
                        className="rounded-md p-1.5 text-outline hover:text-error hover:bg-surface-container-low transition-colors"
                      >
                        <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                      </button>
                    </span>
                  </div>

                  {type.aOptions && (
                    <div className="mt-3">
                      <label className={LABEL}>Options</label>
                      <div className="space-y-1.5">
                        {question.options.map((option, rang) => (
                          <div key={rang} className="flex items-center gap-2">
                            <input
                              aria-label={`Option ${rang + 1}`}
                              className={CHAMP}
                              value={option}
                              onChange={(e) =>
                                modifierQuestion(index, {
                                  options: question.options.map((o, i) =>
                                    i === rang ? e.target.value : o
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              aria-label={`Retirer l'option ${rang + 1}`}
                              onClick={() =>
                                modifierQuestion(index, {
                                  options: question.options.filter((_, i) => i !== rang),
                                })
                              }
                              className="rounded-md p-1.5 text-outline hover:text-error transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            modifierQuestion(index, { options: [...question.options, ""] })
                          }
                          className="text-body-sm font-medium text-primary hover:underline"
                        >
                          + Ajouter une option
                        </button>
                      </div>
                    </div>
                  )}

                  {question.type === "ECHELLE" && (
                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-body-sm text-on-surface-variant">
                        De
                        <input
                          type="number"
                          aria-label="Note minimale"
                          className={`${CHAMP} ml-1.5 w-[70px] inline-block`}
                          value={question.config.min ?? 1}
                          onChange={(e) =>
                            modifierQuestion(index, {
                              config: { ...question.config, min: Number(e.target.value) },
                            })
                          }
                        />
                      </label>
                      <label className="text-body-sm text-on-surface-variant">
                        à
                        <input
                          type="number"
                          aria-label="Note maximale"
                          className={`${CHAMP} ml-1.5 w-[70px] inline-block`}
                          value={question.config.max ?? 5}
                          onChange={(e) =>
                            modifierQuestion(index, {
                              config: { ...question.config, max: Number(e.target.value) },
                            })
                          }
                        />
                      </label>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      aria-label={`Texte d'aide de la question ${index + 1}`}
                      className={`${CHAMP} flex-1 min-w-[200px]`}
                      value={question.aide ?? ""}
                      onChange={(e) => modifierQuestion(index, { aide: e.target.value || null })}
                      placeholder="Texte d'aide (facultatif)"
                    />
                    <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={question.obligatoire}
                        onChange={(e) => modifierQuestion(index, { obligatoire: e.target.checked })}
                      />
                      Obligatoire
                    </label>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setQuestions((l) => [...l, vierge()])}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter une question
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className={LABEL}>Publication</p>
            <div className="flex flex-wrap gap-2">
              {forme.statut !== "PUBLIE" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => appliquer({ statut: "PUBLIE" }, "Formulaire publié.")}
                  className="h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
                >
                  Publier
                </button>
              )}
              {forme.statut === "PUBLIE" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => appliquer({ statut: "CLOS" }, "Formulaire clos.")}
                  className="h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Clore
                </button>
              )}
              {forme.statut === "CLOS" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => appliquer({ statut: "PUBLIE" }, "Formulaire rouvert.")}
                  className="h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Rouvrir
                </button>
              )}
            </div>
            <p className="mt-2 text-label-md text-outline">
              Un formulaire ne reçoit de réponse qu&apos;une fois publié.
            </p>
          </section>

          <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <label className={LABEL}>Qui peut répondre</label>
            <select
              className={CHAMP}
              value={forme.acces}
              disabled={busy}
              onChange={(e) => appliquer({ acces: e.target.value }, "Accès mis à jour.")}
            >
              {Object.entries(ACCES_LABELS).map(([cle, libelle]) => (
                <option key={cle} value={cle}>
                  {libelle}
                </option>
              ))}
            </select>

            {forme.acces === "PUBLIC" && (
              <div className="mt-3">
                <p className="text-label-md text-outline">
                  Lien à partager — il ne demande aucun compte.
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <input readOnly className={`${CHAMP} font-mono text-label-md`} value={lienPublic} />
                  <button
                    type="button"
                    aria-label="Copier le lien public"
                    onClick={() => {
                      void navigator.clipboard?.writeText(lienPublic);
                      setToast("Lien copié.");
                    }}
                    className="flex-none rounded-lg border border-outline-soft p-2 text-outline hover:text-primary transition-colors"
                  >
                    <ContentCopyOutlined style={{ fontSize: 16 }} />
                  </button>
                </div>
                {forme.statut !== "PUBLIE" && (
                  <p className="mt-1.5 text-label-md text-error">
                    Le lien reste fermé tant que le formulaire n&apos;est pas publié.
                  </p>
                )}
              </div>
            )}

            <label className="mt-3 flex items-center gap-2 text-body-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={forme.une_reponse_par_personne}
                disabled={busy}
                onChange={(e) =>
                  appliquer(
                    { une_reponse_par_personne: e.target.checked },
                    "Règle de réponse mise à jour."
                  )
                }
              />
              Une seule réponse par personne
            </label>
            {forme.acces === "PUBLIC" && forme.une_reponse_par_personne && (
              <p className="mt-1 text-label-md text-outline">
                Sans compte, on ne sait pas qui revient : cette règle ne s&apos;applique
                qu&apos;aux membres connectés.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className={LABEL}>Collaborateurs</p>
            <div className="space-y-1.5">
              {forme.collaborateurs.map((c) => (
                <div key={c.user_id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
                    {c.nom ?? `#${c.user_id}`}
                  </span>
                  <select
                    aria-label={`Rôle de ${c.nom ?? c.user_id}`}
                    className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-label-md text-on-surface outline-none focus:border-primary"
                    value={c.role}
                    disabled={busy || c.user_id === forme.created_by}
                    onChange={(e) =>
                      formsApi
                        .definirCollaborateurs(
                          id,
                          forme.collaborateurs.map((autre) =>
                            autre.user_id === c.user_id
                              ? { user_id: autre.user_id, role: e.target.value }
                              : { user_id: autre.user_id, role: autre.role }
                          )
                        )
                        .then(setForme)
                        .then(() => setToast("Rôles mis à jour."))
                        .catch((err) => setErreur(err.message))
                    }
                  >
                    <option value="CONCEPTEUR">Concepteur</option>
                    <option value="CONSULTATEUR">Consultateur</option>
                  </select>
                  {c.user_id !== forme.created_by && (
                    <button
                      type="button"
                      aria-label={`Retirer ${c.nom ?? c.user_id}`}
                      onClick={() =>
                        formsApi
                          .definirCollaborateurs(
                            id,
                            forme.collaborateurs
                              .filter((autre) => autre.user_id !== c.user_id)
                              .map((autre) => ({ user_id: autre.user_id, role: autre.role }))
                          )
                          .then(setForme)
                          .catch((err) => setErreur(err.message))
                      }
                      className="flex-none rounded-md p-1 text-outline hover:text-error transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2">
              <SearchSelect<{ id: number; nom: string }>
                value={null}
                placeholder="Ajouter un membre…"
                fetchOptions={async (q) =>
                  membres
                    .filter((m) => !forme.collaborateurs.some((c) => c.user_id === m.user.id))
                    .filter((m) => m.user.username.toLowerCase().includes(q.toLowerCase()))
                    .map((m) => ({ id: m.user.id, nom: m.user.username }))
                }
                getOptionLabel={(o) => o.nom}
                onChange={(valeur) => {
                  const userId = Number(valeur);
                  if (!userId) return;
                  formsApi
                    .definirCollaborateurs(id, [
                      ...forme.collaborateurs.map((c) => ({ user_id: c.user_id, role: c.role })),
                      { user_id: userId, role: "CONSULTATEUR" },
                    ])
                    .then(setForme)
                    .then(() => setToast("Collaborateur ajouté."))
                    .catch((err) => setErreur(err.message));
                }}
              />
            </div>
            <p className="mt-2 text-label-md text-outline">
              Un concepteur modifie le formulaire ; un consultateur ne voit que les résultats.
            </p>
          </section>

          <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <label className={LABEL}>Message de confirmation</label>
            <textarea
              rows={2}
              className="w-full resize-y rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
              defaultValue={forme.message_confirmation ?? ""}
              onBlur={(e) =>
                appliquer(
                  { message_confirmation: e.target.value.trim() || null },
                  "Message enregistré."
                )
              }
              placeholder="Merci, votre réponse a bien été enregistrée."
            />
          </section>

          {forme.created_by != null && (
            <button
              type="button"
              onClick={() => setASupprimer(true)}
              className="w-full h-9 rounded-lg border border-outline-soft text-body-sm font-semibold text-error hover:bg-error-container/30 transition-colors"
            >
              Supprimer le formulaire
            </button>
          )}
        </aside>
      </div>

      {aSupprimer && (
        <ConfirmDialog
          title="Supprimer ce formulaire ?"
          message={`Les ${forme.nb_soumissions} réponse${
            forme.nb_soumissions > 1 ? "s" : ""
          } déjà reçue${forme.nb_soumissions > 1 ? "s" : ""} seront effacées. C'est définitif.`}
          confirmLabel="Supprimer"
          onConfirm={() =>
            formsApi
              .supprimer(id)
              .then(() => router.push("/forms"))
              .catch((err) => {
                setErreur(err.message);
                setASupprimer(false);
              })
          }
          onCancel={() => setASupprimer(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Retour() {
  return (
    <Link
      href="/forms"
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Formulaires
    </Link>
  );
}
