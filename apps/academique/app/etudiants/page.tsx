"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddOutlined, GroupsOutlined, UploadFileOutlined } from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";
import { Pagination } from "@repo/ui/Pagination";
import { SaisieRapide } from "@repo/ui/SaisieRapide";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { BarreContexte } from "@/components/BarreContexte";
import { useContexte } from "@/app/lib/etablissement";
import { ImportEtudiants } from "@/components/ImportEtudiants";
import { api, type EtudiantsPage, type ImportEtudiants as TacheImport } from "@/app/lib/api";

const TAILLE = 25;

/** Le registre des étudiants.
 *
 *  « Ajouter » ouvre une SAISIE RAPIDE — le geste de la recherche globale :
 *  nom, post-nom, prénom, sexe, et on arrive sur la fiche. Le matricule est
 *  attribué par l'établissement, et le reste de la fiche se complète là où on
 *  la lit. L'ancien formulaire en ligne demandait un matricule au guichet, ce
 *  qui faisait inventer un format à la personne qui accueille.
 *
 *  Paginé côté serveur : l'ISP en compte des milliers, et une liste complète
 *  ferait un écran qui met dix secondes à s'ouvrir.
 *
 *  L'import prend un CLASSEUR et le traite en tâche de fond : dix mille lignes
 *  ne tiennent pas dans le temps d'une requête, et un écran figé pendant trois
 *  minutes passe pour une panne. L'écran suit l'avancement, puis donne le
 *  journal des lignes écartées — un total seul obligerait à comparer le fichier
 *  au registre pour retrouver les manquants.
 */
export default function EtudiantsPage_() {
  const router = useRouter();
  const { can } = usePermissions();
  const peutGerer = can("academique.etudiants.manage");
  const contexte = useContexte();
  const etab = contexte.etablissement;

  const [liste, setListe] = useState<EtudiantsPage | null>(null);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [archives, setArchives] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [creation, setCreation] = useState(false);

  const [importOuvert, setImportOuvert] = useState(false);
  /** La dernière tâche d'import connue. Fermer la fenêtre ne l'arrête pas :
   *  l'écran continue de la suivre, sinon on croirait l'avoir annulée. */
  const [tacheImport, setTacheImport] = useState<TacheImport | null>(null);

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

  async function creer(valeurs: Record<string, string>) {
    // Sans établissement, l'ancien code sortait EN SILENCE : le bouton
    // « Créer » ne faisait rien, et rien n'expliquait pourquoi. Un workspace
    // neuf n'en a pas encore un — c'est un état, pas une panne, et il se dit.
    if (!etab) {
      setErreur(
        "Cet espace n'a pas encore d'établissement. Ouvrez « Structure » pour le créer : " +
          "un étudiant appartient à un établissement."
      );
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      // Pas de matricule ici : l'établissement en produit un. Le demander au
      // guichet fait inventer un format à la personne qui accueille.
      const cree = await api.creerEtudiant(etab.id, {
        nom: valeurs.nom.trim(),
        postnom: valeurs.postnom.trim() || null,
        prenom: valeurs.prenom.trim() || null,
        sexe: valeurs.sexe || null,
      });
      setCreation(false);
      router.push(`/etudiants/${cree.id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  // On continue de suivre l'import même fenêtre fermée : « continuer en
  // arrière-plan » ne veut rien dire si l'écran cesse de savoir où ça en est.
  const importActif =
    tacheImport !== null &&
    (tacheImport.etat === "EN_ATTENTE" || tacheImport.etat === "EN_COURS");

  // On dépend de l'IDENTIFIANT, pas de la tâche : chaque tour en produit un
  // nouvel objet, et l'intervalle se reconstruirait à chaque battement.
  const idSuivi = tacheImport?.id ?? null;

  useEffect(() => {
    if (!importActif || importOuvert || idSuivi === null) return;
    const minuteur = setInterval(async () => {
      try {
        const suivi = await api.suivreImport(idSuivi);
        setTacheImport(suivi);
        if (suivi.etat === "TERMINE" && suivi.crees > 0) void charger();
      } catch {
        // Un trou de réseau n'efface pas l'avancement déjà affiché.
      }
    }, 3000);
    return () => clearInterval(minuteur);
  }, [importActif, importOuvert, idSuivi, charger]);

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
                onClick={() => setImportOuvert(true)}
                disabled={!etab}
                title={etab ? undefined : "Créez d'abord l'établissement, dans « Structure »."}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                <UploadFileOutlined style={{ fontSize: 17 }} />
                Importer
              </button>
              <button
                type="button"
                onClick={() => setCreation(true)}
                disabled={!etab}
                title={etab ? undefined : "Créez d'abord l'établissement, dans « Structure »."}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter
              </button>
            </div>
          )}
        </div>

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

        {!etab && !contexte.erreur && (
          // Un workspace neuf n'a pas encore d'établissement. Le taire faisait
          // un écran vide et deux boutons qui ne répondaient pas.
          <div className="mb-4 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6">
            <p className="text-body-md text-on-surface">
              Cet espace n&apos;a pas encore d&apos;établissement.
            </p>
            <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
              Un étudiant appartient à un établissement : il faut donc le créer avant de tenir un
              registre.
            </p>
            <Link
              href="/structure"
              className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              Ouvrir la structure
            </Link>
          </div>
        )}

        {tacheImport && !importOuvert && (tacheImport.etat !== "TERMINE" || tacheImport.crees > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-outline-soft bg-surface-container-low px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-on-surface">
                {tacheImport.etat_libelle} — {tacheImport.nom_fichier}
              </p>
              <p className="text-label-md text-outline">
                {tacheImport.lignes_traitees} ligne
                {tacheImport.lignes_traitees > 1 ? "s" : ""} sur {tacheImport.total_lignes} ·{" "}
                {tacheImport.crees} créé{tacheImport.crees > 1 ? "s" : ""}
                {tacheImport.ignores > 0 && ` · ${tacheImport.ignores} écartée${tacheImport.ignores > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setImportOuvert(true)}
              className="h-9 flex-none rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              {importActif ? "Suivre" : "Voir le journal"}
            </button>
            <button
              type="button"
              onClick={() => setTacheImport(null)}
              className="h-9 flex-none rounded-lg px-3 text-body-sm text-outline transition-colors hover:bg-surface-container"
            >
              Masquer
            </button>
          </div>
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

        {creation && (
          <SaisieRapide
            titre="Nouvel étudiant"
            largeur="moyenne"
            intro="Le matricule est attribué par l'établissement ; le reste de la fiche se complète après."
            busy={busy}
            erreur={erreur}
            champs={[
              { nom: "nom", libelle: "Nom", requis: true },
              { nom: "postnom", libelle: "Post-nom" },
              { nom: "prenom", libelle: "Prénom" },
              {
                nom: "sexe",
                libelle: "Sexe",
                type: "choix",
                options: [
                  { valeur: "M", libelle: "Masculin" },
                  { valeur: "F", libelle: "Féminin" },
                ],
              },
            ]}
            onValider={creer}
            onFermer={() => {
              setCreation(false);
              setErreur(null);
            }}
          />
        )}

        {importOuvert && etab && (
          <ImportEtudiants
            etablissementId={etab.id}
            tacheInitiale={tacheImport}
            onFerme={(tache) => {
              setImportOuvert(false);
              setTacheImport(tache);
            }}
            onTermine={() => void charger()}
          />
        )}
      </div>
    </DashboardShell>
  );
}
