"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  ChecklistOutlined,
  Inventory2Outlined,
  PlayArrowOutlined,
  UnarchiveOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { SaisieRapide } from "@repo/ui/SaisieRapide";
import { SearchField } from "@repo/ui/SearchField";
import { Pagination } from "@repo/ui/Pagination";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import {
  FILTRES_VIDES,
  FiltresExecutions,
  estFiltre,
  type FiltresExec,
} from "@/components/FiltresExecutions";
import { ExportExecutions } from "@/components/ExportExecutions";
import { operationsApi, type ExecutionProcess, type Process } from "@/lib/operations-api";

type Onglet = "executions" | "process";

/** Les process d'un espace, et ce qui a été exécuté.
 *
 *  **Les exécutions viennent en premier, et non la liste des process.** La
 *  question du matin n'est pas « quelles routines avons-nous écrites » — on le
 *  sait — mais « qu'est-ce qui a été fait cette nuit, et qu'est-ce qui reste
 *  ouvert ». La liste des process est l'écran de celui qui écrit la checklist ;
 *  il y va rarement, et il sait où le trouver.
 *
 *  Recherche, intervalle et pagination sont **côté serveur** : le registre
 *  grossit d'une ligne par ronde et par jour, et filtrer dans le navigateur
 *  reviendrait à télécharger l'année pour n'en montrer qu'une semaine.
 */
export default function ProcessPage() {
  const { can } = usePermissions();
  const peutGerer = can("operations.process.manage");
  const peutExecuter = can("operations.process.executer");

  const [onglet, setOnglet] = useState<Onglet>("executions");

  const [filtres, setFiltres] = useState<FiltresExec>(FILTRES_VIDES);
  const [pageExec, setPageExec] = useState(1);
  const [journal, setJournal] = useState<ExecutionProcess[] | null>(null);
  const [pagesExec, setPagesExec] = useState(1);
  const [totalExec, setTotalExec] = useState(0);
  const [ouvertes, setOuvertes] = useState(0);

  const [recherche, setRecherche] = useState("");
  const [archives, setArchives] = useState(false);
  const [pageProcess, setPageProcess] = useState(1);
  const [liste, setListe] = useState<Process[] | null>(null);
  const [pagesProcess, setPagesProcess] = useState(1);
  const [totalProcess, setTotalProcess] = useState(0);

  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [busy, setBusy] = useState(false);

  const chargerJournal = useCallback(async () => {
    try {
      const page = await operationsApi.journalExecutions({
        q: filtres.q || undefined,
        statut: filtres.statut === "tous" ? undefined : filtres.statut,
        du: filtres.du || undefined,
        au: filtres.au || undefined,
        page: pageExec,
      });
      setJournal(page.items);
      setPagesExec(page.pages);
      setTotalExec(page.total);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setJournal([]);
    }
  }, [filtres, pageExec]);

  const chargerProcess = useCallback(async () => {
    try {
      const page = await operationsApi.process({
        q: recherche || undefined,
        archives: archives || undefined,
        page: pageProcess,
      });
      setListe(page.items);
      setPagesProcess(page.pages);
      setTotalProcess(page.total);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setListe([]);
    }
  }, [recherche, archives, pageProcess]);

  // Le compteur de l'onglet ne suit pas les filtres : il dit combien de rondes
  // sont ouvertes en tout, y compris quand on regarde une autre semaine.
  const compterOuvertes = useCallback(async () => {
    try {
      setOuvertes((await operationsApi.journalExecutions({ statut: "EN_COURS" })).total);
    } catch {
      setOuvertes(0);
    }
  }, []);

  // Une frappe par lettre ne doit pas faire une requête par lettre.
  useEffect(() => {
    const t = setTimeout(() => void chargerJournal(), 250);
    return () => clearTimeout(t);
  }, [chargerJournal]);

  useEffect(() => {
    const t = setTimeout(() => void chargerProcess(), 250);
    return () => clearTimeout(t);
  }, [chargerProcess]);

  useEffect(() => {
    void compterOuvertes();
  }, [compterOuvertes]);

  // Un filtre qui change remet à la première page : rester en page 4 d'un
  // résultat qui n'en a plus que 2 afficherait une liste vide sans raison.
  useEffect(() => setPageExec(1), [filtres]);
  useEffect(() => setPageProcess(1), [recherche, archives]);

  async function restaurer(p: Process) {
    try {
      await operationsApi.restaurerProcess(p.slug);
      setToast(`« ${p.nom} » est de nouveau en service.`);
      await chargerProcess();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Restauration impossible.");
    }
  }

  async function creer(valeurs: Record<string, string>) {
    const nom = (valeurs.nom ?? "").trim();
    if (!nom) return;
    setBusy(true);
    setErreur(null);
    try {
      const cree = await operationsApi.creerProcess({
        nom,
        description: (valeurs.description ?? "").trim() || null,
      });
      setOuvert(false);
      setToast(`« ${cree.nom} » est créé. Ajoutez ses étapes et leurs points.`);
      await chargerProcess();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">Process</h1>
            <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
              Des routines à exécuter — une ronde de contrôle, une clôture. Chaque passage
              laisse sa trace : ce qui a été relevé, ce qui ne l&apos;était pas, et par qui.
            </p>
          </div>
          {onglet === "process" && (
            <button
              type="button"
              disabled={!peutGerer}
              onClick={() => setOuvert(true)}
              title={peutGerer ? undefined : "Vous n'avez pas le droit de créer un process."}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouveau process
            </button>
          )}
        </div>

        <nav className="mt-5 flex gap-1 border-b border-outline-soft">
          <OngletBouton
            actif={onglet === "executions"}
            onClick={() => setOnglet("executions")}
            badge={ouvertes || undefined}
          >
            Exécutions
          </OngletBouton>
          <OngletBouton actif={onglet === "process"} onClick={() => setOnglet("process")}>
            Process
          </OngletBouton>
        </nav>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {onglet === "executions" ? (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <FiltresExecutions valeurs={filtres} onChange={setFiltres} />
              <ExportExecutions base="/api/executions/export" filtres={filtres} />
            </div>

            {journal === null ? (
              <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
            ) : journal.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-outline-soft px-4 py-8 text-center text-body-sm text-on-surface-variant">
                {estFiltre(filtres)
                  ? "Aucune exécution ne correspond à ces filtres."
                  : "Aucun process n'a encore été exécuté."}
              </p>
            ) : (
              <>
                <ListeExecutions executions={journal} avecNom />
                <BasDeListe
                  total={totalExec}
                  page={pageExec}
                  pages={pagesExec}
                  onChange={setPageExec}
                  singulier="exécution"
                />
              </>
            )}
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SearchField
                value={recherche}
                onChange={setRecherche}
                placeholder="Rechercher un process…"
                className="w-full sm:w-[20rem]"
              />
              {/* Les deux listes ne se mélangent pas : archiver sert justement à
                  sortir un process de celle où on choisit quoi exécuter. */}
              <button
                type="button"
                onClick={() => setArchives((a) => !a)}
                aria-pressed={archives}
                className={`inline-flex h-[38px] items-center gap-1.5 rounded-lg px-3 text-label-md transition-colors ${
                  archives
                    ? "bg-primary text-on-primary"
                    : "border border-outline-soft text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                <Inventory2Outlined style={{ fontSize: 16 }} />
                Archivés
              </button>
            </div>

            {liste === null ? (
              <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
            ) : liste.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-outline-soft p-8 text-center">
                <ChecklistOutlined style={{ fontSize: 40 }} className="text-outline" />
                <p className="mt-2 text-title-sm text-on-surface">
                  {recherche ? "Aucun résultat" : archives ? "Aucun archivé" : "Aucun process"}
                </p>
                <p className="mx-auto mt-1 max-w-[52ch] text-body-sm text-on-surface-variant">
                  {recherche
                    ? "Aucun process ne porte ce nom, ni cette description."
                    : archives
                      ? "Rien n'a été rangé ici. Un process archivé ne s'exécute plus, mais garde tout son historique."
                      : "Créez-en un : donnez-lui un nom, puis ses étapes et leurs points à contrôler. Une équipe pourra ensuite le passer, autant de fois qu'il le faut."}
                </p>
              </div>
            ) : (
              <>
                <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
                  {liste.map((p) => (
                    <li
                      key={p.id}
                      className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container-low ${
                        p.actif ? "" : "opacity-60"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <Link
                          href={`/process/${p.slug}`}
                          className="block truncate text-body-sm text-on-surface hover:text-primary"
                        >
                          {p.nom}
                          {!p.actif && (
                            <span
                              className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"
                              title={
                                p.archive_le
                                  ? `Archivé le ${new Date(p.archive_le).toLocaleDateString("fr-FR")}${
                                      p.archive_par_nom ? ` par ${p.archive_par_nom}` : ""
                                    }`
                                  : undefined
                              }
                            >
                              archivé
                            </span>
                          )}
                        </Link>
                        {p.description && (
                          <span className="block truncate text-label-md text-on-surface-variant">
                            {p.description}
                          </span>
                        )}
                      </span>

                      <span className="shrink-0 text-label-md text-outline">
                        {p.points} point{p.points > 1 ? "s" : ""} · v{p.version}
                      </span>
                      <span className="shrink-0 text-label-md text-outline">
                        {p.derniere_execution_le
                          ? `${p.executions} exécution${p.executions > 1 ? "s" : ""} · dernière le ${new Date(
                              p.derniere_execution_le,
                            ).toLocaleDateString("fr-FR")}`
                          : "jamais exécuté"}
                      </span>

                      {p.actif && peutExecuter && p.mes_droits?.executer !== false && (
                        <Link
                          href={`/process/${p.slug}`}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                        >
                          <PlayArrowOutlined style={{ fontSize: 16 }} />
                          Exécuter
                        </Link>
                      )}
                      {!p.actif && peutGerer && p.mes_droits?.concevoir !== false && (
                        <button
                          type="button"
                          onClick={() => void restaurer(p)}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                        >
                          <UnarchiveOutlined style={{ fontSize: 16 }} />
                          Restaurer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <BasDeListe
                  total={totalProcess}
                  page={pageProcess}
                  pages={pagesProcess}
                  onChange={setPageProcess}
                  singulier="process"
                  pluriel="process"
                />
              </>
            )}
          </>
        )}
      </div>

      {ouvert && (
        <SaisieRapide
          titre="Nouveau process"
          intro="Le nom devient l'adresse de la page. Les étapes et leurs points s'ajoutent ensuite."
          largeur="moyenne"
          champs={[
            { nom: "nom", libelle: "Nom", requis: true },
            { nom: "description", libelle: "À quoi il sert", aide: "Facultatif" },
          ]}
          libelleValider="Créer"
          busy={busy}
          erreur={erreur}
          onValider={(valeurs) => void creer(valeurs)}
          onFermer={() => setOuvert(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}

function OngletBouton({
  actif,
  onClick,
  badge,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={actif}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-body-sm transition-colors ${
        actif
          ? "border-primary text-primary"
          : "border-transparent text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {children}
      {badge !== undefined && (
        <span className="rounded-full bg-primary/10 px-1.5 text-label-sm text-primary">
          {badge}
        </span>
      )}
    </button>
  );
}

export function BasDeListe({
  total,
  page,
  pages,
  onChange,
  singulier,
  pluriel,
}: {
  total: number;
  page: number;
  pages: number;
  onChange: (page: number) => void;
  singulier: string;
  pluriel?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <span className="text-label-md text-outline">
        {total} {total > 1 ? (pluriel ?? `${singulier}s`) : singulier}
      </span>
      <Pagination page={page} pages={pages} onChange={onChange} />
    </div>
  );
}

/** Le registre, une ligne par passage. */
export function ListeExecutions({
  executions,
  avecNom = false,
}: {
  executions: ExecutionProcess[];
  avecNom?: boolean;
}) {
  return (
    <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
      {executions.map((e) => (
        <li key={e.id}>
          <Link
            href={`/executions/${e.id}`}
            className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-low"
          >
            <span className="min-w-0 flex-1">
              {avecNom && (
                <span className="block truncate text-body-sm text-on-surface">
                  {e.process_nom}
                </span>
              )}
              <span
                className={`block ${avecNom ? "text-label-md text-outline" : "text-body-sm text-on-surface"}`}
              >
                {new Date(e.ouverte_le).toLocaleString("fr-FR")}
                <span className="ml-1.5 text-label-sm text-outline">v{e.process_version}</span>
              </span>
              {!avecNom && e.note && (
                <span className="block truncate text-label-md text-outline">{e.note}</span>
              )}
            </span>
            <Bilan execution={e} />
            <Etat execution={e} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Etat({ execution }: { execution: ExecutionProcess }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm ${
        execution.statut === "TERMINEE"
          ? "bg-secondary/15 text-secondary"
          : execution.statut === "EN_COURS"
            ? "bg-primary/10 text-primary"
            : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {execution.statut_libelle}
    </span>
  );
}

/** Répondus, anomalies, restants — d'un coup d'œil.
 *
 *  Une exécution « terminée » ne dit pas si tout allait bien : c'est le nombre
 *  d'anomalies qui le dit, et c'est lui qu'on cherche. */
export function Bilan({ execution }: { execution: ExecutionProcess }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-label-md">
      <span className="text-secondary">
        {execution.repondus}/{execution.points}
      </span>
      {execution.anomalies > 0 && <span className="text-error">{execution.anomalies} ✕</span>}
      {execution.restants > 0 && <span className="text-outline">{execution.restants} restants</span>}
    </span>
  );
}
