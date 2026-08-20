"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, GroupsOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { CarteTravail } from "@/components/ListeTravaux";
import { useContexte } from "@/app/lib/contexte";
import { academia, api, type Directeur, type EtudiantAcademique, type Projet } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Les projets tutorés — des groupes, un sujet, un directeur.
 *
 *  Le chef est membre de son groupe : l'écran le montre en le comptant avec les
 *  autres, comme le serveur l'enregistre.
 */
export default function ProjetsPage() {
  const { can } = usePermissions();
  const peutInstruire = can("isp.travaux.instruire");
  const peutDeposer = can("isp.travaux.deposer");
  const contexte = useContexte();

  const [projets, setProjets] = useState<Projet[] | null>(null);
  const [etudiants, setEtudiants] = useState<EtudiantAcademique[]>([]);
  const [directeurs, setDirecteurs] = useState<Directeur[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({ chef: "", sujet: "", directeur_id: "" });
  const [ajout, setAjout] = useState<Record<number, string>>({});

  const unite = contexte.unite;

  const charger = useCallback(async () => {
    if (!unite) return;
    try {
      const [liste, dirs, etus] = await Promise.all([
        api.projets({ unite: unite.id }),
        api.directeurs({ unite: unite.id, type_travail: "PROJET_TUTORE" }),
        academia.etudiantsDeLUnite(unite.id).catch(() => ({ items: [], total: 0 })),
      ]);
      setProjets(liste);
      setDirecteurs(dirs);
      setEtudiants(etus.items);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setProjets([]);
    }
  }, [unite]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const nom = (id: number) => etudiants.find((e) => e.id === id)?.nom_complet ?? `#${id}`;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Projets tutorés</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Un groupe d&apos;étudiants, un sujet, un directeur. Le chef du groupe est
          l&apos;interlocuteur de l&apos;administration.
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
              aria-label="Chef de groupe"
              className={CHAMP}
              value={nouveau.chef}
              onChange={(e) => setNouveau({ ...nouveau, chef: e.target.value })}
            >
              <option value="">Chef du groupe…</option>
              {etudiants.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom_complet}
                </option>
              ))}
            </select>
            <input
              className={`${CHAMP} md:col-span-2`}
              placeholder="Sujet du projet"
              value={nouveau.sujet}
              onChange={(e) => setNouveau({ ...nouveau, sujet: e.target.value })}
            />
            <select
              aria-label="Directeur"
              className={CHAMP}
              value={nouveau.directeur_id}
              onChange={(e) => setNouveau({ ...nouveau, directeur_id: e.target.value })}
            >
              <option value="">Directeur (facultatif)</option>
              {directeurs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!nouveau.chef || !nouveau.sujet.trim()}
              onClick={async () => {
                try {
                  await api.deposerProjet({
                    chef_etudiant_id: Number(nouveau.chef),
                    sujet: nouveau.sujet.trim(),
                    directeur_id: nouveau.directeur_id ? Number(nouveau.directeur_id) : null,
                  });
                  setNouveau({ chef: "", sujet: "", directeur_id: "" });
                  setToast("Projet déposé.");
                  await charger();
                } catch (e) {
                  setErreur(e instanceof Error ? e.message : "Dépôt impossible.");
                }
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Déposer
            </button>
          </section>
        )}

        {projets === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : projets.length === 0 ? (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <GroupsOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Aucun projet dans ce département.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projets.map((p) => (
              <div key={p.id}>
                <CarteTravail
                  titre={p.sujet}
                  sousTitre={`${p.membres.length} membre${p.membres.length > 1 ? "s" : ""} · chef ${nom(p.chef_etudiant_id)}${p.directeur_nom ? ` · dirigé par ${p.directeur_nom}` : ""}`}
                  travail={p}
                  peutInstruire={peutInstruire}
                  onDecision={async (statut, motif) => {
                    try {
                      await api.deciderProjet(p.id, statut, motif);
                      setToast("Décision enregistrée.");
                      await charger();
                    } catch (e) {
                      setErreur(e instanceof Error ? e.message : "Action impossible.");
                    }
                  }}
                />
                <div className="mt-1 flex flex-wrap items-center gap-2 px-4">
                  <span className="text-label-md text-outline">
                    {p.membres.map(nom).join(", ")}
                  </span>
                  {peutDeposer && p.statut === "DEPOSE" && (
                    <>
                      <select
                        aria-label={`Ajouter un membre au projet ${p.id}`}
                        className={`${CHAMP} ml-auto`}
                        value={ajout[p.id] ?? ""}
                        onChange={(e) => setAjout({ ...ajout, [p.id]: e.target.value })}
                      >
                        <option value="">Ajouter un membre…</option>
                        {etudiants
                          .filter((e) => !p.membres.includes(e.id))
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.nom_complet}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!ajout[p.id]}
                        onClick={async () => {
                          try {
                            await api.ajouterMembre(p.id, Number(ajout[p.id]));
                            setAjout({ ...ajout, [p.id]: "" });
                            await charger();
                          } catch (e) {
                            setErreur(e instanceof Error ? e.message : "Ajout impossible.");
                          }
                        }}
                        className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
