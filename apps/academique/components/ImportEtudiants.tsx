"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  ErrorOutlineOutlined,
  InsertDriveFileOutlined,
  UploadFileOutlined,
} from "@mui/icons-material";
import { Modal } from "@repo/ui/Modal";
import { Pagination } from "@repo/ui/Pagination";
import { api, type ImportEtudiants as Tache, type LignesImportPage } from "@/app/lib/api";

const EXTENSIONS = [".xlsx", ".xlsm", ".csv", ".txt"];
const TAILLE_JOURNAL = 25;

/** Le dépôt d'un fichier d'étudiants, et le suivi de son traitement.
 *
 *  **Trois moments, une seule fenêtre.** Déposer, regarder avancer, lire le
 *  journal : les séparer en trois écrans ferait perdre le fil à l'endroit
 *  précis où l'on veut savoir ce qui s'est passé — et obligerait à retrouver
 *  son import dans une liste.
 *
 *  **Deux avancements distincts, et on le dit.** Le fichier MONTE d'abord (des
 *  octets), puis il est TRAITÉ (des lignes). Les confondre dans une seule barre
 *  ferait un compteur qui repart à zéro sans raison visible.
 *
 *  On interroge le serveur en boucle plutôt que d'ouvrir un canal : un import
 *  dure des minutes, pas des heures, et le hub temps réel n'a pas à connaître
 *  chaque tâche de chaque app pour ça.
 */
export function ImportEtudiants({
  etablissementId,
  tacheInitiale = null,
  onFerme,
  onTermine,
}: {
  etablissementId: number;
  /** Une tâche déjà en cours qu'on rouvre — fermer la fenêtre ne l'arrête pas. */
  tacheInitiale?: Tache | null;
  /** Appelé à la fermeture, avec la tâche connue à cet instant (ou `null`). */
  onFerme: (tache: Tache | null) => void;
  /** Appelé quand des étudiants ont été créés : le registre derrière est périmé. */
  onTermine: () => void;
}) {
  const [fichier, setFichier] = useState<File | null>(null);
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [tache, setTache] = useState<Tache | null>(tacheInitiale);
  const [erreur, setErreur] = useState<string | null>(null);

  const [journal, setJournal] = useState<LignesImportPage | null>(null);
  const [pageJournal, setPageJournal] = useState(1);

  const champ = useRef<HTMLInputElement | null>(null);
  const previent = useRef(false);

  const fini = tache?.etat === "TERMINE" || tache?.etat === "ECHOUE";

  // Le suivi : on s'arrête dès que la tâche a conclu — continuer à interroger
  // un import terminé ferait une requête toutes les deux secondes, pour rien.
  // L'IDENTIFIANT en dépendance, pas la tâche : chaque tour en rend un nouvel
  // objet, et l'intervalle se reconstruirait à chaque battement.
  const idTache = tache?.id ?? null;

  useEffect(() => {
    if (idTache === null || fini) return;
    const minuteur = setInterval(async () => {
      try {
        setTache(await api.suivreImport(idTache));
      } catch {
        // Un trou de réseau ne doit pas effacer l'avancement déjà affiché :
        // le prochain tour rattrapera.
      }
    }, 1500);
    return () => clearInterval(minuteur);
  }, [idTache, fini]);

  useEffect(() => {
    if (tache?.etat === "TERMINE" && tache.crees > 0 && !previent.current) {
      previent.current = true;
      onTermine();
    }
  }, [tache, onTermine]);

  const chargerJournal = useCallback(
    async (page: number) => {
      if (!tache) return;
      setJournal(await api.journalImport(tache.id, page, TAILLE_JOURNAL));
      setPageJournal(page);
    },
    [tache]
  );

  function accepter(candidat: File | null | undefined) {
    if (!candidat) return;
    const nom = candidat.name.toLowerCase();
    if (!EXTENSIONS.some((e) => nom.endsWith(e))) {
      setErreur("Un classeur Excel (.xlsx) ou un CSV — les autres formats ne se lisent pas.");
      return;
    }
    setErreur(null);
    setFichier(candidat);
  }

  async function deposer() {
    if (!fichier) return;
    setErreur(null);
    setEnvoi(0);
    try {
      const cree = await api.deposerImport(etablissementId, fichier, setEnvoi);
      setTache(cree);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le dépôt a échoué.");
    } finally {
      setEnvoi(null);
    }
  }

  const pourcentTraitement = tache?.total_lignes
    ? Math.round((tache.lignes_traitees / tache.total_lignes) * 100)
    : 0;

  return (
    <Modal
      title="Importer des étudiants"
      onClose={() => onFerme(tache)}
      width="max-w-[42rem]"
      headerAside={tache ? tache.etat_libelle : undefined}
      footer={
        tache ? (
          <>
            <button
              type="button"
              onClick={() => onFerme(tache)}
              className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              {fini ? "Fermer" : "Continuer en arrière-plan"}
            </button>
            {fini && tache.ignores > 0 && journal === null && (
              <button
                type="button"
                onClick={() => void chargerJournal(1)}
                className="h-9 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                Voir le journal ({tache.ignores})
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!fichier || envoi !== null}
              onClick={deposer}
              className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              {envoi !== null ? `Envoi ${envoi}%` : "Importer"}
            </button>
            <a
              href={api.modeleImportUrl(etablissementId)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              <DownloadOutlined style={{ fontSize: 17 }} />
              Télécharger le modèle
            </a>
            <button
              type="button"
              onClick={() => onFerme(tache)}
              className="ml-auto h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Annuler
            </button>
          </>
        )
      }
    >
      {erreur && (
        <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {!tache ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setSurvol(true);
            }}
            onDragLeave={() => setSurvol(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSurvol(false);
              accepter(e.dataTransfer.files?.[0]);
            }}
            onClick={() => champ.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") champ.current?.click();
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center transition-colors ${
              survol
                ? "border-primary bg-primary-container/30"
                : "border-outline-soft bg-surface-container-lowest hover:bg-surface-container-low"
            }`}
          >
            {fichier ? (
              <>
                <InsertDriveFileOutlined style={{ fontSize: 30 }} className="text-primary" />
                <p className="mt-2 text-body-md font-medium text-on-surface">{fichier.name}</p>
                <p className="mt-0.5 text-label-md text-outline">
                  {(fichier.size / 1024).toFixed(0)} Ko — cliquez pour en choisir un autre
                </p>
              </>
            ) : (
              <>
                <UploadFileOutlined style={{ fontSize: 30 }} className="text-outline" />
                <p className="mt-2 text-body-md text-on-surface">
                  Glissez le fichier ici, ou cliquez pour le choisir
                </p>
                <p className="mt-0.5 text-label-md text-outline">
                  Classeur Excel (.xlsx) ou CSV — 10 Mo au maximum
                </p>
              </>
            )}
            <input
              ref={champ}
              type="file"
              accept={EXTENSIONS.join(",")}
              className="hidden"
              onChange={(e) => accepter(e.target.files?.[0])}
            />
          </div>

          {envoi !== null && (
            <div className="mt-4">
              <Barre pourcent={envoi} />
              <p className="mt-1 text-label-md text-outline">Envoi du fichier — {envoi}%</p>
            </div>
          )}

          <p className="mt-4 text-label-md text-outline">
            La première ligne nomme les colonnes. <strong>matricule</strong> et{" "}
            <strong>nom</strong> sont obligatoires ; postnom, prenom, sexe, date_naissance,
            lieu_naissance, nationalite, telephone, email et adresse sont lues si elles sont là.
            Le reste est ignoré, pas refusé.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            {tache.etat === "TERMINE" ? (
              <CheckCircleOutlined style={{ fontSize: 22 }} className="mt-0.5 text-primary" />
            ) : tache.etat === "ECHOUE" ? (
              <ErrorOutlineOutlined style={{ fontSize: 22 }} className="mt-0.5 text-error" />
            ) : (
              <InsertDriveFileOutlined
                style={{ fontSize: 22 }}
                className="mt-0.5 text-on-surface-variant"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-md font-medium text-on-surface">
                {tache.nom_fichier}
              </p>
              <p className="text-label-md text-outline">{tache.etat_libelle}</p>
            </div>
          </div>

          {tache.etat !== "ECHOUE" && (
            <div className="mt-4">
              <Barre pourcent={pourcentTraitement} />
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Compteur libelle="Traitées" valeur={tache.lignes_traitees} />
                <Compteur libelle="Restantes" valeur={tache.restantes} />
                <Compteur libelle="Créés" valeur={tache.crees} />
                <Compteur libelle="Écartées" valeur={tache.ignores} accent={tache.ignores > 0} />
              </div>
              <p className="mt-2 text-label-md text-outline">
                {tache.lignes_traitees} ligne{tache.lignes_traitees > 1 ? "s" : ""} sur{" "}
                {tache.total_lignes}
                {!fini && " — vous pouvez fermer cette fenêtre, le traitement continue."}
              </p>
            </div>
          )}

          {tache.message && (
            <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
              {tache.message}
            </p>
          )}

          {fini && tache.ignores > 0 && journal === null && (
            <p className="mt-4 text-body-sm text-on-surface-variant">
              {tache.ignores} ligne{tache.ignores > 1 ? "s ont" : " a"} été écartée
              {tache.ignores > 1 ? "s" : ""}. Le journal dit laquelle, et pourquoi.
            </p>
          )}

          {journal && (
            <div className="mt-4">
              <p className="text-label-md font-medium text-on-surface-variant">
                Journal — {journal.total} ligne{journal.total > 1 ? "s" : ""} écartée
                {journal.total > 1 ? "s" : ""}
              </p>
              <div className="mt-2 divide-y divide-hairline overflow-hidden rounded-xl border border-outline-soft">
                {journal.items.map((l) => (
                  <div key={l.ligne} className="flex flex-wrap gap-2 px-3 py-2 text-label-md">
                    <span className="w-16 flex-none font-mono text-outline">L{l.ligne}</span>
                    <span className="w-[150px] flex-none truncate font-mono text-on-surface-variant">
                      {l.matricule ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-on-surface-variant">
                      {l.nom ?? ""}
                    </span>
                    <span className="flex-none text-error">{l.raison}</span>
                  </div>
                ))}
              </div>
              {journal.total > TAILLE_JOURNAL && (
                <div className="mt-3 flex justify-center">
                  <Pagination
                    page={pageJournal}
                    pages={Math.ceil(journal.total / TAILLE_JOURNAL)}
                    onChange={(p) => void chargerJournal(p)}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Barre({ pourcent }: { pourcent: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={pourcent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-container"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, pourcent))}%` }}
      />
    </div>
  );
}

function Compteur({
  libelle,
  valeur,
  accent = false,
}: {
  libelle: string;
  valeur: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-surface-container-low px-3 py-2">
      <p className="text-label-sm text-outline">{libelle}</p>
      <p className={`text-body-lg font-semibold ${accent ? "text-error" : "text-on-surface"}`}>
        {valeur}
      </p>
    </div>
  );
}
