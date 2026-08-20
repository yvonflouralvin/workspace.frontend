"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, SchoolOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Enseignant, type Unite } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Les enseignants et leurs rattachements.
 *
 *  Un enseignant intervient dans plusieurs unités, et sa fonction — chef de
 *  département, coordonnateur — appartient au RATTACHEMENT, pas à la personne :
 *  le même enseignant peut coordonner ici et simplement intervenir ailleurs.
 */
export default function EnseignantsPage() {
  const { can } = usePermissions();
  const peutGerer = can("academique.structure.manage");
  const contexte = useContexte();
  const etab = contexte.etablissement;

  const [enseignants, setEnseignants] = useState<Enseignant[] | null>(null);
  const [unites, setUnites] = useState<Unite[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nouveau, setNouveau] = useState({ nom: "", postnom: "", titre: "" });
  const [rattachement, setRattachement] = useState<Record<number, { unite: string; fonction: string }>>({});

  const charger = useCallback(async () => {
    if (!etab) return;
    try {
      const [e, u] = await Promise.all([api.enseignants(etab.id), api.unites(etab.id)]);
      setEnseignants(e);
      setUnites(u);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setEnseignants([]);
    }
  }, [etab]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function creer() {
    if (!etab || !nouveau.nom.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerEnseignant(etab.id, {
        nom: nouveau.nom.trim(),
        postnom: nouveau.postnom.trim() || null,
        titre: nouveau.titre.trim() || null,
      });
      setNouveau({ nom: "", postnom: "", titre: "" });
      setToast("Enseignant ajouté.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ajout impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Enseignants</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Qui enseigne, et où. Le rattachement à une fiche du personnel est facultatif : un
          vacataire enseigne sans figurer aux effectifs.
        </p>

        <div className="mt-4">
          <BarreContexte
            etablissement={etab}
            surnombre={contexte.surnombre}
          />
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        {peutGerer && (
          <section className="mb-4 grid gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:grid-cols-4">
            <input
              className={CHAMP}
              placeholder="Nom *"
              value={nouveau.nom}
              onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
            />
            <input
              className={CHAMP}
              placeholder="Post-nom"
              value={nouveau.postnom}
              onChange={(e) => setNouveau({ ...nouveau, postnom: e.target.value })}
            />
            <input
              className={CHAMP}
              placeholder="Titre (Professeur, Chef de travaux…)"
              value={nouveau.titre}
              onChange={(e) => setNouveau({ ...nouveau, titre: e.target.value })}
            />
            <button
              type="button"
              disabled={busy || !nouveau.nom.trim()}
              onClick={creer}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter
            </button>
          </section>
        )}

        {enseignants === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : enseignants.length === 0 ? (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <SchoolOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-sm text-on-surface-variant">Aucun enseignant.</p>
          </div>
        ) : (
          <div className="divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {enseignants.map((e) => (
              <div key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md text-on-surface">
                      {e.nom_complet}
                    </span>
                    {e.titre && (
                      <span className="block text-label-md text-outline">{e.titre}</span>
                    )}
                  </span>
                </div>

                {peutGerer && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Rattacher ${e.nom_complet}`}
                      className={CHAMP}
                      value={rattachement[e.id]?.unite ?? ""}
                      onChange={(ev) =>
                        setRattachement({
                          ...rattachement,
                          [e.id]: {
                            unite: ev.target.value,
                            fonction: rattachement[e.id]?.fonction ?? "",
                          },
                        })
                      }
                    >
                      <option value="">Rattacher à une unité…</option>
                      {unites.map((u) => (
                        <option key={u.id} value={u.id}>
                          {"— ".repeat(u.profondeur)}
                          {u.libelle}
                        </option>
                      ))}
                    </select>
                    <input
                      className={`${CHAMP} w-[220px]`}
                      placeholder="Fonction (facultative)"
                      value={rattachement[e.id]?.fonction ?? ""}
                      onChange={(ev) =>
                        setRattachement({
                          ...rattachement,
                          [e.id]: {
                            unite: rattachement[e.id]?.unite ?? "",
                            fonction: ev.target.value,
                          },
                        })
                      }
                    />
                    <button
                      type="button"
                      disabled={busy || !rattachement[e.id]?.unite}
                      onClick={async () => {
                        try {
                          await api.rattacherEnseignant(
                            e.id,
                            Number(rattachement[e.id].unite),
                            rattachement[e.id].fonction || undefined
                          );
                          setRattachement({ ...rattachement, [e.id]: { unite: "", fonction: "" } });
                          setToast("Rattachement enregistré.");
                          await charger();
                        } catch (err) {
                          setErreur(
                            err instanceof Error ? err.message : "Rattachement impossible."
                          );
                        }
                      }}
                      className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
                    >
                      Rattacher
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
