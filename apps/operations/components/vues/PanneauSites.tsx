"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, PlaceOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { operationsApi, type Occupation, type Site } from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

export function PanneauSites() {
  const { can } = usePermissions();
  const peutGerer = can("operations.sites.manage");

  const [sites, setSites] = useState<Site[] | null>(null);
  const [occupation, setOccupation] = useState<Record<number, Occupation>>({});
  const [edition, setEdition] = useState<Site | "nouveau" | null>(null);
  const [aSupprimer, setASupprimer] = useState<Site | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const debut = new Date();
      debut.setDate(1);
      const fin = new Date(debut);
      fin.setMonth(fin.getMonth() + 1);
      const [liste, occ] = await Promise.all([
        operationsApi.sites(),
        operationsApi.occupation(debut.toISOString(), fin.toISOString()),
      ]);
      setSites(liste);
      setOccupation(Object.fromEntries(occ.map((o) => [o.site_id, o])));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les sites.");
      setSites([]);
    }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  return (
    <>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">Sites</h1>
            <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
              Les lieux de prestation. Les chiffres portent sur le mois en cours.
            </p>
          </div>
          {peutGerer && (
            <button
              type="button"
              onClick={() => setEdition("nouveau")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouveau site
            </button>
          )}
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>
        )}

        {sites === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : sites.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <PlaceOutlined style={{ fontSize: 28 }} className="text-outline" />
            <p className="mt-2 text-body-md text-on-surface">Aucun site.</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Un site est un lieu de prestation — une école, un entrepôt, un client.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {sites.map((s) => {
              const o = occupation[s.id];
              return (
                <article
                  key={s.id}
                  className={`rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 ${s.active ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-8 w-1.5 flex-none rounded-full"
                      style={{ backgroundColor: s.couleur ?? "#777587" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-md font-medium text-on-surface">
                        {s.nom}
                        {!s.active && (
                          <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                            Inactif
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-body-sm text-on-surface-variant">
                        {[s.adresse, s.ville].filter(Boolean).join(", ") || "—"}
                      </p>
                      <p className="mt-1 text-label-md text-outline">
                        {o ? `${o.ressources} ressource(s) · ${o.prestations} prestation(s) · ${o.heures} h` : "Aucune affectation ce mois-ci"}
                      </p>
                    </div>
                  </div>
                  {peutGerer && (
                    <div className="mt-3 flex gap-3">
                      <button type="button" onClick={() => setEdition(s)} className="text-label-md text-primary">
                        Modifier
                      </button>
                      <button type="button" onClick={() => setASupprimer(s)} className="text-label-md text-on-surface-variant hover:text-error">
                        Supprimer
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {edition && (
        <FormulaireSite
          site={edition === "nouveau" ? null : edition}
          onClose={() => setEdition(null)}
          onDone={() => { setEdition(null); setToast("Site enregistré."); void charger(); }}
        />
      )}

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.nom} » ?`}
          message="Un site qui porte des affectations ne peut pas être supprimé — désactivez-le pour le retirer des choix sans perdre l'historique."
          confirmLabel="Supprimer"
          onCancel={() => setASupprimer(null)}
          onConfirm={async () => {
            try {
              await operationsApi.supprimerSite(aSupprimer.id);
              setToast("Site supprimé.");
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Suppression impossible.");
            } finally { setASupprimer(null); }
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

function FormulaireSite({ site, onClose, onDone }: { site: Site | null; onClose: () => void; onDone: () => void }) {
  const [nom, setNom] = useState(site?.nom ?? "");
  const [adresse, setAdresse] = useState(site?.adresse ?? "");
  const [ville, setVille] = useState(site?.ville ?? "");
  const [couleur, setCouleur] = useState(site?.couleur ?? "#3525cd");
  const [actif, setActif] = useState(site?.active ?? true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer() {
    if (!nom.trim()) { setErreur("Le nom est requis."); return; }
    setEnCours(true); setErreur(null);
    const corps = {
      nom: nom.trim(),
      adresse: adresse.trim() || null,
      ville: ville.trim() || null,
      couleur,
      ...(site ? { active: actif } : {}),
    };
    try {
      if (site) await operationsApi.modifierSite(site.id, corps);
      else await operationsApi.creerSite(corps);
      onDone();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally { setEnCours(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[28rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">{site ? "Modifier le site" : "Nouveau site"}</h2>
        </div>
        <div className="flex flex-col gap-3 px-5 py-4">
          {erreur && <p className="text-body-sm text-error">{erreur}</p>}
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Nom *</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Adresse</span>
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} className={CHAMP} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Ville</span>
            <input value={ville} onChange={(e) => setVille(e.target.value)} className={CHAMP} />
          </label>
          <label className="flex items-center gap-3">
            <span className="text-label-md text-on-surface-variant">Couleur au calendrier</span>
            <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)} className="h-8 w-14 rounded" />
          </label>
          {site && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
              <span className="text-body-sm text-on-surface">Site actif</span>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low">Annuler</button>
          <button type="button" disabled={enCours} onClick={envoyer} className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50">
            {enCours ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
