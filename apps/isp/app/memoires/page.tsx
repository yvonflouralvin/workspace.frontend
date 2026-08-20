"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, DescriptionOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { CarteTravail } from "@/components/ListeTravaux";
import { useContexte } from "@/app/lib/contexte";
import { academia, api, type Directeur, type EtudiantAcademique, type Memoire } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Les mémoires du département.
 *
 *  Les étudiants et les directeurs viennent de deux sources : les premiers
 *  d'Academia — l'ISP ne tient pas de registre —, les seconds de l'ISP, parce
 *  qu'« être directeur de mémoire ici » est une fonction que le socle n'a pas
 *  à connaître.
 */
export default function MemoiresPage() {
  const { can } = usePermissions();
  const peutInstruire = can("isp.travaux.instruire");
  const peutDeposer = can("isp.travaux.deposer");
  const contexte = useContexte();

  const [memoires, setMemoires] = useState<Memoire[] | null>(null);
  const [etudiants, setEtudiants] = useState<EtudiantAcademique[]>([]);
  const [directeurs, setDirecteurs] = useState<Directeur[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({ etudiant_id: "", sujet: "", directeur_id: "" });

  const unite = contexte.unite;

  const charger = useCallback(async () => {
    if (!unite) return;
    try {
      const [liste, dirs, etus] = await Promise.all([
        api.memoires({ unite: unite.id }),
        api.directeurs({ unite: unite.id, type_travail: "MEMOIRE" }),
        academia.etudiantsDeLUnite(unite.id).catch(() => ({ items: [], total: 0 })),
      ]);
      setMemoires(liste);
      setDirecteurs(dirs);
      setEtudiants(etus.items);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setMemoires([]);
    }
  }, [unite]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const nomEtudiant = (id: number) =>
    etudiants.find((e) => e.id === id)?.nom_complet ?? `Étudiant #${id}`;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Mémoires</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Un sujet se dépose, se valide ou se refuse — un refus s&apos;explique. Le travail
          finit par être soutenu.
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
                  {e.nom_complet} — {e.matricule}
                </option>
              ))}
            </select>
            <input
              className={`${CHAMP} md:col-span-2`}
              placeholder="Sujet du mémoire"
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
              disabled={!nouveau.etudiant_id || !nouveau.sujet.trim()}
              onClick={async () => {
                try {
                  await api.deposerMemoire({
                    etudiant_id: Number(nouveau.etudiant_id),
                    sujet: nouveau.sujet.trim(),
                    directeur_id: nouveau.directeur_id ? Number(nouveau.directeur_id) : null,
                  });
                  setNouveau({ etudiant_id: "", sujet: "", directeur_id: "" });
                  setToast("Sujet déposé.");
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

        {memoires === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : memoires.length === 0 ? (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <DescriptionOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Aucun mémoire dans ce département.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {memoires.map((m) => (
              <CarteTravail
                key={m.id}
                titre={m.sujet}
                sousTitre={`${nomEtudiant(m.etudiant_id)}${m.directeur_nom ? ` · dirigé par ${m.directeur_nom}` : " · sans directeur"}`}
                travail={m}
                peutInstruire={peutInstruire}
                onDecision={async (statut, motif) => {
                  try {
                    await api.deciderMemoire(m.id, statut, motif);
                    setToast("Décision enregistrée.");
                    await charger();
                  } catch (e) {
                    setErreur(e instanceof Error ? e.message : "Action impossible.");
                  }
                }}
              />
            ))}
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
