"use client";

import { useCallback, useEffect, useState } from "react";
import { HomeWorkOutlined, PictureAsPdfOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/contexte";
import { api, type Depot } from "@/app/lib/api";

const TEINTE: Record<string, string> = {
  NOUVEAU: "bg-primary/10 text-primary",
  CONSULTE: "bg-surface-container text-on-surface-variant",
  VALIDE: "bg-secondary/15 text-secondary",
  REJETE: "bg-error-container/60 text-error",
};

const LIBELLE: Record<string, string> = {
  NOUVEAU: "Nouveau",
  CONSULTE: "Consulté",
  VALIDE: "Validé",
  REJETE: "Rejeté",
};

/** Les mémoires déposés SANS COMPTE.
 *
 *  Un ancien étudiant n'a plus d'accès : lui demander de créer un compte pour
 *  rendre son mémoire l'empêcherait de le rendre. Cet écran est le pendant
 *  administratif de cette porte publique.
 */
export default function DepotsPage() {
  const contexte = useContexte();
  const [depots, setDepots] = useState<Depot[] | null>(null);
  const [statut, setStatut] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const unite = contexte.unite;

  const charger = useCallback(async () => {
    try {
      setDepots(await api.depots({ unite: unite?.id, statut: statut || undefined }));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setDepots([]);
    }
  }, [unite, statut]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Dépôts de mémoire</h1>
        <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
          Les mémoires déposés depuis la page publique, sans compte.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BarreContexte
            unites={contexte.unites}
            unite={unite}
            onUnite={contexte.setUnite}
            annee={contexte.annee}
          />
          <select
            aria-label="Filtrer par état"
            className="mb-5 h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
          >
            <option value="">Tous les états</option>
            {Object.entries(LIBELLE).map(([cle, libelle]) => (
              <option key={cle} value={cle}>
                {libelle}
              </option>
            ))}
          </select>
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        {depots === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : depots.length === 0 ? (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <HomeWorkOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-sm text-on-surface-variant">Aucun dépôt.</p>
          </div>
        ) : (
          <div className="divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {depots.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-on-surface">
                    {d.nom_complet}
                  </span>
                  <span className="block truncate text-label-md text-outline">
                    {d.telephone}
                    {d.sujet && ` · ${d.sujet}`}
                  </span>
                </span>
                <a
                  href={api.fichierDepotUrl(d.id)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Ouvrir le mémoire de ${d.nom_complet}`}
                  className="flex-none text-outline transition-colors hover:text-primary"
                >
                  <PictureAsPdfOutlined style={{ fontSize: 18 }} />
                </a>
                <select
                  aria-label={`État du dépôt de ${d.nom_complet}`}
                  className={`h-8 flex-none rounded-full border-0 px-2 text-label-md ${TEINTE[d.statut]}`}
                  value={d.statut}
                  onChange={async (e) => {
                    try {
                      await api.statuerDepot(d.id, e.target.value);
                      setToast("État mis à jour.");
                      await charger();
                    } catch (err) {
                      setErreur(err instanceof Error ? err.message : "Action impossible.");
                    }
                  }}
                >
                  {Object.entries(LIBELLE).map(([cle, libelle]) => (
                    <option key={cle} value={cle}>
                      {libelle}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
