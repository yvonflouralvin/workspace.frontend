"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AddOutlined, GroupsOutlined, UploadFileOutlined } from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";
import { Pagination } from "@repo/ui/Pagination";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { api, type EtudiantsPage, type RapportImport } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";
const TAILLE = 25;

/** Le registre des étudiants.
 *
 *  Paginé côté serveur : l'ISP en compte des milliers, et une liste complète
 *  ferait un écran qui met dix secondes à s'ouvrir.
 *
 *  L'import colle un fichier CSV — première ligne d'en-têtes — et rend le
 *  compte de ce qui a été écarté, ligne par ligne. On l'affiche en entier : un
 *  total seul obligerait à comparer le fichier au registre pour retrouver les
 *  manquants.
 */
export default function EtudiantsPage_() {
  const { can } = usePermissions();
  const peutGerer = can("academique.etudiants.manage");
  const contexte = useContexte();
  const etab = contexte.etablissement;

  const [liste, setListe] = useState<EtudiantsPage | null>(null);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [archives, setArchives] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [creation, setCreation] = useState(false);
  const [fiche, setFiche] = useState({ matricule: "", nom: "", postnom: "", prenom: "" });

  const [importOuvert, setImportOuvert] = useState(false);
  const [csv, setCsv] = useState("");
  const [rapport, setRapport] = useState<RapportImport | null>(null);

  const charger = useCallback(async () => {
    if (!etab) return;
    try {
      setListe(
        await api.etudiants(etab.id, { q: recherche, page, taille: TAILLE, archives })
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setListe({ items: [], total: 0, page: 1, taille: TAILLE });
    }
  }, [etab, recherche, page, archives]);

  useEffect(() => {
    const t = setTimeout(() => void charger(), 250);
    return () => clearTimeout(t);
  }, [charger]);

  async function creer() {
    if (!etab || !fiche.matricule.trim() || !fiche.nom.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerEtudiant(etab.id, {
        matricule: fiche.matricule.trim(),
        nom: fiche.nom.trim(),
        postnom: fiche.postnom.trim() || null,
        prenom: fiche.prenom.trim() || null,
      });
      setFiche({ matricule: "", nom: "", postnom: "", prenom: "" });
      setCreation(false);
      setToast("Étudiant ajouté au registre.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function importer() {
    if (!etab || !csv.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      // Le CSV se découpe ici : le serveur reçoit des lignes typées, et n'a pas
      // à deviner un séparateur ni un encodage.
      const lignes = csv.trim().split(/\r?\n/);
      const entetes = lignes[0].split(/[;,\t]/).map((h) => h.trim().toLowerCase());
      const corps = lignes.slice(1).map((ligne) => {
        const cellules = ligne.split(/[;,\t]/);
        const objet: Record<string, unknown> = {};
        entetes.forEach((entete, i) => {
          objet[entete] = (cellules[i] ?? "").trim();
        });
        return objet;
      });
      setRapport(await api.importer(etab.id, corps));
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  const pages = Math.max(1, Math.ceil((liste?.total ?? 0) / TAILLE));

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">Étudiants</h1>
            <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
              Le registre de l&apos;établissement. Un étudiant y existe avant d&apos;être
              inscrit, et y reste après.
            </p>
          </div>
          {peutGerer && (
            <div className="flex flex-none flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setImportOuvert((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                <UploadFileOutlined style={{ fontSize: 17 }} />
                Importer
              </button>
              <button
                type="button"
                onClick={() => setCreation((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <BarreContexte
            etablissements={contexte.etablissements}
            etablissement={etab}
            onEtablissement={contexte.setEtablissement}
          />
        </div>

        {(erreur || contexte.erreur) && (
          <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur ?? contexte.erreur}
          </p>
        )}

        {creation && (
          <section className="mb-4 grid gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:grid-cols-4">
            <input
              className={CHAMP}
              placeholder="Matricule *"
              value={fiche.matricule}
              onChange={(e) => setFiche({ ...fiche, matricule: e.target.value })}
            />
            <input
              className={CHAMP}
              placeholder="Nom *"
              value={fiche.nom}
              onChange={(e) => setFiche({ ...fiche, nom: e.target.value })}
            />
            <input
              className={CHAMP}
              placeholder="Post-nom"
              value={fiche.postnom}
              onChange={(e) => setFiche({ ...fiche, postnom: e.target.value })}
            />
            <input
              className={CHAMP}
              placeholder="Prénom"
              value={fiche.prenom}
              onChange={(e) => setFiche({ ...fiche, prenom: e.target.value })}
            />
            <button
              type="button"
              disabled={busy || !fiche.matricule.trim() || !fiche.nom.trim()}
              onClick={creer}
              className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              Enregistrer
            </button>
          </section>
        )}

        {importOuvert && (
          <section className="mb-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className="text-body-sm text-on-surface">
              Collez le contenu du fichier — première ligne, les en-têtes.
            </p>
            <p className="mt-0.5 text-label-md text-outline">
              Colonnes reconnues : matricule, nom, postnom, prenom, sexe, telephone, email.
            </p>
            <textarea
              rows={6}
              aria-label="Contenu CSV"
              className="mt-2 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 font-mono text-label-md text-on-surface outline-none focus:border-primary"
              placeholder={"matricule;nom;postnom;prenom\nISP/2025/001;LONGO;KAYEMBE;Mardochée"}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !csv.trim()}
              onClick={importer}
              className="mt-2 h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              Importer
            </button>

            {rapport && (
              <div className="mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm">
                <p className="font-medium text-on-surface">
                  {rapport.crees} étudiant{rapport.crees > 1 ? "s" : ""} ajouté
                  {rapport.crees > 1 ? "s" : ""}.
                </p>
                {rapport.ignores.length > 0 && (
                  <>
                    <p className="mt-1 text-on-surface-variant">
                      Lignes écartées — {rapport.ignores.length} :
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {rapport.ignores.map((i, n) => (
                        <li key={n} className="text-label-md text-on-surface-variant">
                          <span className="text-on-surface">ligne {i.ligne}</span>
                          {i.matricule && ` (${i.matricule})`} — {i.raison}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchField
            value={recherche}
            onChange={(v) => {
              setRecherche(v);
              setPage(1);
            }}
            placeholder="Matricule, nom, courriel…"
            className="w-full sm:w-[300px]"
          />
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={archives}
              onChange={(e) => {
                setArchives(e.target.checked);
                setPage(1);
              }}
            />
            Voir les archivés
          </label>
          {liste && (
            <span className="ml-auto text-label-md text-outline">
              {liste.total} étudiant{liste.total > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {liste === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : liste.items.length === 0 ? (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <GroupsOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-md text-on-surface">
              {recherche ? "Aucun étudiant ne correspond." : "Le registre est vide."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
              {liste.items.map((e) => (
                <Link
                  key={e.id}
                  href={`/etudiants/${e.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-low"
                >
                  <span className="w-[150px] flex-none truncate font-mono text-label-md text-outline">
                    {e.matricule}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
                    {e.nom_complet}
                  </span>
                  {e.archive && (
                    <span className="flex-none rounded-full bg-surface-container px-2 py-0.5 text-label-md text-outline">
                      archivé
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {pages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination page={page} pages={pages} onChange={setPage} />
              </div>
            )}
          </>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
