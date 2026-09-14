"use client";

import { useEffect, useRef, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { DashboardShell } from "@/components/DashboardShell";
import { AideFlottante } from "@/components/AideFlottante";
import { AIDE_REFERENTIELS } from "@/components/aide-contenu";
import {
  listReferentiels,
  createReferentiel,
  deleteReferentiel,
  listReferentielComptes,
  importerReferentielExcel,
  TYPE_COMPTE_LABELS,
  type Referentiel,
  type ReferentielCompte,
} from "@/lib/compta-api";
import { AddOutlined, DownloadOutlined, DeleteOutlined, UploadFileOutlined, ExpandMoreOutlined, ExpandLessOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function ReferentielsPage() {
  const { can } = usePermissions();
  const canManage = can("comptabilite.parametrage.manage");

  const [referentiels, setReferentiels] = useState<Referentiel[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [baseId, setBaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<Referentiel | null>(null);
  const [suppression, setSuppression] = useState(false);

  const [ouvert, setOuvert] = useState<number | null>(null);
  const [comptesParRef, setComptesParRef] = useState<Record<number, ReferentielCompte[]>>({});

  const [importCible, setImportCible] = useState<Referentiel | null>(null);
  const [importResultat, setImportResultat] = useState<string | null>(null);
  const [importErreur, setImportErreur] = useState<string | null>(null);
  const [important, setImportant] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reload() {
    listReferentiels().then(setReferentiels);
  }

  useEffect(() => {
    reload();
  }, []);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createReferentiel({
        nom: nom.trim(),
        description: description.trim() || undefined,
        base_referentiel_id: baseId ? Number(baseId) : null,
      });
      setNom("");
      setDescription("");
      setBaseId("");
      setAjout(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    setSuppression(true);
    try {
      await deleteReferentiel(aSupprimer.id);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSuppression(false);
      setASupprimer(null);
    }
  }

  async function toggleComptes(r: Referentiel) {
    if (ouvert === r.id) {
      setOuvert(null);
      return;
    }
    setOuvert(r.id);
    if (!comptesParRef[r.id]) {
      const comptes = await listReferentielComptes(r.id);
      setComptesParRef((prev) => ({ ...prev, [r.id]: comptes }));
    }
  }

  function demarrerImport(r: Referentiel) {
    setImportCible(r);
    setImportResultat(null);
    setImportErreur(null);
    fileInputRef.current?.click();
  }

  async function surFichierChoisi(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier || !importCible) return;
    setImportant(true);
    setImportErreur(null);
    setImportResultat(null);
    try {
      const res = await importerReferentielExcel(importCible.id, fichier);
      setImportResultat(`${res.crees} créé(s), ${res.mis_a_jour} mis à jour, ${res.total} au total.`);
      setComptesParRef((prev) => {
        const copy = { ...prev };
        delete copy[importCible.id];
        return copy;
      });
      reload();
    } catch (err) {
      setImportErreur(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setImportant(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-5">
        <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={surFichierChoisi} />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Référentiels de plan comptable</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Modèles chargeables dans « Plan comptable » — système ou personnalisés.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <a
                href="/api/compta/referentiels/modele"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <DownloadOutlined style={{ fontSize: 16 }} />
                Modèle Excel
              </a>
              {!ajout && (
                <button
                  type="button"
                  onClick={() => setAjout(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
                >
                  <AddOutlined style={{ fontSize: 16 }} />
                  Référentiel personnalisé
                </button>
              )}
            </div>
          )}
        </div>

        {importResultat && (
          <p className="rounded-lg border border-member-active-container bg-member-active-container/30 px-3 py-2 text-body-sm text-member-active">
            Import « {importCible?.nom} » : {importResultat}
          </p>
        )}
        {importErreur && (
          <p className="rounded-lg border border-error-container bg-error-container/40 px-3 py-2 text-body-sm text-error">
            Import « {importCible?.nom} » : {importErreur}
          </p>
        )}
        {important && <p className="text-body-sm text-on-surface-variant">Import en cours…</p>}

        {ajout && (
          <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            {error && <p className="text-body-sm text-error w-full">{error}</p>}
            <div className="flex-1 min-w-[200px]">
              <span className="block text-label-sm uppercase text-outline mb-1">Nom</span>
              <input value={nom} onChange={(e) => setNom(e.target.value)} className={`${FIELD} w-full`} required autoFocus />
            </div>
            <div className="flex-1 min-w-[200px]">
              <span className="block text-label-sm uppercase text-outline mb-1">Description</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${FIELD} w-full`} placeholder="Optionnel" />
            </div>
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1">Partir de</span>
              <select value={baseId} onChange={(e) => setBaseId(e.target.value)} className={FIELD}>
                <option value="">Vide</option>
                {referentiels?.map((r) => (
                  <option key={r.id} value={r.id}>{r.nom}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={() => setAjout(false)} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "…" : "Créer"}
            </button>
          </form>
        )}

        {referentiels === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : (
          <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            {referentiels.map((r) => (
              <li key={r.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button type="button" onClick={() => toggleComptes(r)} className="text-outline hover:text-on-surface transition-colors">
                    {ouvert === r.id ? <ExpandLessOutlined style={{ fontSize: 18 }} /> : <ExpandMoreOutlined style={{ fontSize: 18 }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-medium text-on-surface">
                      {r.nom}{" "}
                      <span className={`ml-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${r.systeme ? "bg-surface-container text-on-surface-variant" : "bg-tertiary/10 text-tertiary"}`}>
                        {r.systeme ? "Système" : "Personnalisé"}
                      </span>
                    </p>
                    <p className="text-label-md text-outline">
                      {r.description ?? "—"} · {r.nombre_comptes} comptes
                    </p>
                  </div>
                  {canManage && !r.systeme && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => demarrerImport(r)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                      >
                        <UploadFileOutlined style={{ fontSize: 16 }} />
                        Importer
                      </button>
                      <button
                        type="button"
                        onClick={() => setASupprimer(r)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-body-sm font-semibold text-error hover:bg-error-container transition-colors"
                      >
                        <DeleteOutlined style={{ fontSize: 16 }} />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                {ouvert === r.id && (
                  <div className="px-4 pb-3">
                    {!comptesParRef[r.id] ? (
                      <p className="text-body-sm text-on-surface-variant">Chargement…</p>
                    ) : comptesParRef[r.id].length === 0 ? (
                      <p className="text-body-sm text-on-surface-variant">Aucun compte.</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-hairline">
                        <table className="w-full text-body-sm">
                          <tbody className="divide-y divide-hairline">
                            {comptesParRef[r.id].map((c) => (
                              <tr key={c.id}>
                                <td className="px-3 py-1.5 font-mono w-24">{c.numero}</td>
                                <td className="px-3 py-1.5">{c.libelle}</td>
                                <td className="px-3 py-1.5 text-label-md text-outline w-28">{TYPE_COMPTE_LABELS[c.type_compte]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {aSupprimer && (
          <ConfirmDialog
            title={`Supprimer « ${aSupprimer.nom} » ?`}
            message="Ce référentiel sera définitivement supprimé. Les comptes déjà chargés dans le plan comptable à partir de lui ne sont pas affectés."
            confirmLabel="Supprimer"
            busy={suppression}
            onConfirm={confirmerSuppression}
            onCancel={() => setASupprimer(null)}
          />
        )}
      </div>
      <AideFlottante titre={AIDE_REFERENTIELS.titre}>{AIDE_REFERENTIELS.contenu}</AideFlottante>
    </DashboardShell>
  );
}
