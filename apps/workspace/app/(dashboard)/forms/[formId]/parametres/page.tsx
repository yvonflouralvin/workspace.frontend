"use client";

import { useState } from "react";
import { ContentCopyOutlined } from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { Toast } from "@repo/ui/Toast";
import { useSessionStore } from "@repo/auth/store/session.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { listMembers } from "@/app/lib/api";
import type { Member } from "@/app/lib/types";
import { ACCES_LABELS, formsApi } from "@/app/lib/forms-api";
import { useFormulaire } from "../form-context";

const CHAMP =
  "h-9 w-full px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

/** Tout ce qui ne concerne pas les questions : publication, portée, partage.
 *
 *  Séparé de l'édition parce que ce sont deux gestes différents — on écrit ses
 *  questions, puis on décide à qui on l'ouvre. Les mélanger dans une colonne
 *  latérale rendait la page longue et l'un des deux toujours mal placé.
 */
export default function ParametresFormulairePage() {
  const { forme, recharger, setForme } = useFormulaire();
  const router = useRouter();
  const id = forme.id;
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const [membres, setMembres] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState(false);

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
      setForme(await formsApi.modifier(id, corps));
      setToast(message);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  const lienPublic =
    typeof window !== "undefined" ? `${window.location.origin}/f/${forme.jeton_public}` : "";

  if (!forme.peut_modifier) {
    return (
      <p className="text-body-md text-on-surface-variant">
        Seul un concepteur règle le partage de ce formulaire.
      </p>
    );
  }

  return (
    <div className="max-w-[640px] space-y-4">
      {erreur && (
        <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

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
