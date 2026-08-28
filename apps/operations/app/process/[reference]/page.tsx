"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowBackOutlined,
  ContentCopyOutlined,
  Inventory2Outlined,
  PlayArrowOutlined,
  UnarchiveOutlined,
} from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { SaisieRapide } from "@repo/ui/SaisieRapide";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import { ExportExecutions } from "@/components/ExportExecutions";
import { PartageProcess } from "@/components/PartageProcess";
import { BasDeListe, ListeExecutions } from "@/app/process/page";
import {
  FILTRES_VIDES,
  FiltresExecutions,
  estFiltre,
  type FiltresExec,
} from "@/components/FiltresExecutions";
import {
  EditeurChecklist,
  versBrouillon,
  type SectionBrouillon,
} from "@/components/EditeurChecklist";
import {
  ErreurApi,
  operationsApi,
  type ExecutionProcess,
  type Process,
} from "@/lib/operations-api";

type Onglet = "conception" | "executions";

/** Un process : sa checklist, et l'historique de ses passages.
 *
 *  **Écrire la liste et la passer sont deux droits.** Celui qui fait la ronde
 *  du matin n'a pas à pouvoir retirer un point à contrôler — sinon la
 *  checklist n'enregistre plus que ce qu'on a bien voulu y mettre. L'écran le
 *  montre : sans le droit d'écrire, la liste s'affiche en lecture.
 */
export default function ProcessDetailPage() {
  const params = useParams<{ reference: string }>();
  const reference = params.reference;
  const router = useRouter();
  const { can } = usePermissions();
  const peutGerer = can("operations.process.manage");
  const peutExecuter = can("operations.process.executer");

  const [onglet, setOnglet] = useState<Onglet | null>(null);
  const [process, setProcess] = useState<Process | null>(null);
  const [executions, setExecutions] = useState<ExecutionProcess[] | null>(null);
  const [filtres, setFiltres] = useState<FiltresExec>(FILTRES_VIDES);
  const [pageExec, setPageExec] = useState(1);
  const [pagesExec, setPagesExec] = useState(1);
  const [totalExec, setTotalExec] = useState(0);
  const [sections, setSections] = useState<SectionBrouillon[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // « Réservé » et « n'existe pas » ne se disent pas pareil : servir le même
  // message aux deux ferait chercher un process qu'on a sous les yeux.
  const [refus, setRefus] = useState<"introuvable" | "reserve" | null>(null);
  const [aArchiver, setAArchiver] = useState(false);
  const [aDupliquer, setADupliquer] = useState(false);

  const charger = useCallback(async () => {
    try {
      const p = await operationsApi.unProcess(reference);
      setProcess(p);
      setSections(versBrouillon(p));
      setErreur(null);
    } catch (e) {
      setRefus(e instanceof ErreurApi && e.statut === 403 ? "reserve" : "introuvable");
    }
  }, [reference]);

  const chargerExecutions = useCallback(async () => {
    try {
      const page = await operationsApi.executionsDe(reference, {
        statut: filtres.statut === "tous" ? undefined : filtres.statut,
        du: filtres.du || undefined,
        au: filtres.au || undefined,
        page: pageExec,
      });
      setExecutions(page.items);
      setPagesExec(page.pages);
      setTotalExec(page.total);
    } catch {
      setExecutions([]);
    }
  }, [reference, filtres, pageExec]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    void chargerExecutions();
  }, [chargerExecutions]);

  // Un filtre qui change remet à la première page : rester en page 4 d'un
  // résultat qui n'en a plus que 2 afficherait une liste vide sans raison.
  useEffect(() => setPageExec(1), [filtres]);

  // Un onglet ne s'affiche que s'il a quelque chose à montrer À CETTE
  // PERSONNE. Un agent qui passe la ronde n'a rien à faire dans l'écran de
  // conception : lui servir la checklist en lecture seule, c'est l'envoyer
  // dans un contenu qui ne le concerne pas et où il ne peut rien faire.
  const voitConception = !!process?.mes_droits?.concevoir && peutGerer;
  const voitExecutions = !!process?.mes_droits?.consulter;

  useEffect(() => {
    if (onglet !== null || !process) return;
    setOnglet(voitConception ? "conception" : voitExecutions ? "executions" : null);
  }, [onglet, process, voitConception, voitExecutions]);

  const modifie =
    process !== null && JSON.stringify(sections) !== JSON.stringify(versBrouillon(process));

  const nombreDePoints = sections.reduce((n, s) => n + s.points.length, 0);

  async function enregistrer() {
    setBusy(true);
    setErreur(null);
    try {
      await operationsApi.poserSections(
        reference,
        sections
          .filter((s) => s.titre.trim())
          .map((s) => ({
            ...s,
            titre: s.titre.trim(),
            points: s.points
              .filter((p) => p.libelle.trim())
              .map((p) => ({ ...p, libelle: p.libelle.trim() })),
          })),
      );
      setToast("Checklist enregistrée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function archiver() {
    setBusy(true);
    setErreur(null);
    try {
      setProcess(await operationsApi.archiverProcess(reference));
      setAArchiver(false);
      setToast("Process archivé. Son historique reste consultable.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Archivage impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function restaurer() {
    setBusy(true);
    setErreur(null);
    try {
      setProcess(await operationsApi.restaurerProcess(reference));
      setToast("Process de nouveau en service.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Restauration impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function dupliquer(valeurs: Record<string, string>) {
    setBusy(true);
    setErreur(null);
    try {
      const copie = await operationsApi.dupliquerProcess(
        reference,
        (valeurs.nom ?? "").trim() || undefined,
      );
      setADupliquer(false);
      router.push(`/process/${copie.slug}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Duplication impossible.");
      setBusy(false);
    }
  }

  async function demarrer() {
    setBusy(true);
    setErreur(null);
    try {
      const execution = await operationsApi.ouvrirExecution(reference);
      router.push(`/executions/${execution.id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de démarrer.");
      setBusy(false);
    }
  }

  if (refus) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-[900px] p-8">
          <p className="text-body-md text-on-surface-variant">
            {refus === "reserve"
              ? "Ce process est réservé à ses collaborateurs. Demandez à son propriétaire de vous y ajouter."
              : "Ce process n'existe pas."}
          </p>
          <Link href="/process" className="mt-2 inline-block text-body-sm text-primary">
            Retour aux process
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[900px] p-4 md:p-8">
        <Link
          href="/process"
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Process
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">
              {process?.nom ?? "…"}
            </h1>
            {process?.description && (
              <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
                {process.description}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={
              busy ||
              !peutExecuter ||
              !process?.mes_droits?.executer ||
              !process?.actif ||
              nombreDePoints === 0
            }
            onClick={() => void demarrer()}
            title={
              !peutExecuter
                ? "Vous n'avez pas le droit d'exécuter un process."
                : process && !process.mes_droits?.executer
                  ? "Ce process est réservé à ses collaborateurs."
                  : nombreDePoints === 0
                    ? "Ajoutez au moins un point à contrôler."
                    : undefined
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <PlayArrowOutlined style={{ fontSize: 18 }} />
            Démarrer une exécution
          </button>
        </div>

        {process && !process.actif && (
          <p className="mt-3">
            <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-md text-on-surface-variant">
              Archivé
              {process.archive_le
                ? ` le ${new Date(process.archive_le).toLocaleDateString("fr-FR")}`
                : ""}
              {process.archive_par_nom ? ` par ${process.archive_par_nom}` : ""}
            </span>
          </p>
        )}

        {(voitConception || voitExecutions) && (
          <nav className="mt-5 flex gap-1 border-b border-outline-soft">
            {voitConception && (
              <OngletBouton
                actif={onglet === "conception"}
                onClick={() => setOnglet("conception")}
              >
                Conception
              </OngletBouton>
            )}
            {voitExecutions && (
              <OngletBouton
                actif={onglet === "executions"}
                onClick={() => setOnglet("executions")}
                badge={totalExec || undefined}
              >
                Exécutions
              </OngletBouton>
            )}
          </nav>
        )}

        {/* Ni la conception ni le registre : il reste ce pour quoi cette
            personne est venue — passer la checklist. */}
        {process && !voitConception && !voitExecutions && (
          <p className="mt-5 rounded-2xl border border-dashed border-outline-soft px-4 py-8 text-center text-body-sm text-on-surface-variant">
            {process.mes_droits?.executer
              ? "Vous pouvez exécuter ce process. Sa conception et son registre sont réservés à ses collaborateurs."
              : "Ce process est réservé à ses collaborateurs."}
          </p>
        )}

        {onglet === "conception" && voitConception ? (
          <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-body-md font-semibold text-on-surface">Points à contrôler</h2>
              {process && (
                <span
                  className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"
                  title="Chaque réécriture de la checklist compte une nouvelle version. Les exécutions déjà faites gardent la leur."
                >
                  version {process.version}
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-[70ch] text-label-md text-outline">
              Une étape regroupe les points d&apos;un même endroit — le sous-sol, la façade.
              Chaque point est une question : une case à cocher, une valeur à relever, un
              commentaire, un choix. Un point obligatoire empêche de conclure tant qu&apos;il
              n&apos;a pas de réponse. Réécrire cette liste ne touche pas aux exécutions déjà
              faites : chacune garde sa propre copie des étapes et des questions, avec leurs
              options et leurs bornes.
            </p>

            <div className="mt-3">
              <EditeurChecklist
              sections={sections}
              onChange={setSections}
              lecture={!peutGerer || !process?.mes_droits?.concevoir}
            />
            </div>

            {peutGerer && process?.mes_droits?.concevoir && (
              <div className="mt-3 flex items-center gap-3 border-t border-outline-soft pt-3">
                <button
                  type="button"
                  disabled={busy || !modifie}
                  onClick={() => void enregistrer()}
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  Enregistrer la checklist
                </button>
                {modifie && (
                  <span className="text-label-md text-outline">
                    Modifications non enregistrées.
                  </span>
                )}
              </div>
            )}
          </section>
        ) : null}

        {onglet === "conception" && voitConception && process && (
          <PartageProcess
            process={process}
            onChange={setProcess}
            lecture={!process.mes_droits?.concevoir}
          />
        )}

        {/* Tout en bas : ces gestes-là ne se font pas en passant. */}
        {onglet === "conception" && voitConception && process && (
          <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <h2 className="text-body-md font-semibold text-on-surface">Ce process</h2>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-hairline pt-3">
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm text-on-surface">Dupliquer</span>
                <span className="block max-w-[62ch] text-label-md text-outline">
                  Repartir de cette checklist : étapes, questions, options et bornes sont
                  recopiées, ainsi que la visibilité. Les exécutions passées ne suivent pas.
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setADupliquer(true)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
              >
                <ContentCopyOutlined style={{ fontSize: 16 }} />
                Dupliquer
              </button>
            </div>

            {process.mes_droits?.concevoir && (
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-hairline pt-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm text-on-surface">
                    {process.actif ? "Archiver" : "Remettre en service"}
                  </span>
                  <span className="block max-w-[62ch] text-label-md text-outline">
                    {process.actif
                      ? "Il ne sera plus proposé à l'exécution et sortira de la liste. Ses exécutions passées restent consultables — c'est pourquoi un process ne se supprime pas."
                      : "Il réapparaîtra dans la liste et pourra de nouveau être exécuté."}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (process.actif ? setAArchiver(true) : void restaurer())}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  {process.actif ? (
                    <>
                      <Inventory2Outlined style={{ fontSize: 16 }} />
                      Archiver
                    </>
                  ) : (
                    <>
                      <UnarchiveOutlined style={{ fontSize: 16 }} />
                      Restaurer
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {onglet === "executions" && voitExecutions && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <FiltresExecutions
                valeurs={filtres}
                onChange={setFiltres}
                avecRecherche={false}
              />
              <ExportExecutions
                base={`/api/process/${reference}/executions/export`}
                filtres={filtres}
                avecRecherche={false}
              />
            </div>

            {executions === null ? (
              <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
            ) : executions.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-outline-soft px-4 py-8 text-center text-body-sm text-on-surface-variant">
                {estFiltre(filtres)
                  ? "Aucune exécution ne correspond à ces filtres."
                  : "Ce process n'a jamais été exécuté."}
              </p>
            ) : (
              <>
                <ListeExecutions executions={executions} />
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
        )}
      </div>

      {aArchiver && (
        <ConfirmDialog
          title="Archiver ce process ?"
          message="Il ne sera plus proposé à l'exécution. Ses exécutions passées restent consultables, et vous pourrez le remettre en service à tout moment."
          confirmLabel="Archiver"
          tone="primary"
          busy={busy}
          onConfirm={() => void archiver()}
          onCancel={() => setAArchiver(false)}
        />
      )}

      {aDupliquer && (
        <SaisieRapide
          titre="Dupliquer ce process"
          intro="La checklist entière est recopiée — étapes, questions, options et bornes — ainsi que sa visibilité. Les exécutions passées, elles, ne suivent pas."
          largeur="moyenne"
          champs={[
            {
              nom: "nom",
              libelle: "Nom de la copie",
              aide: `Laissé vide : « ${process?.nom ?? ""} (copie) »`,
            },
          ]}
          libelleValider="Dupliquer"
          busy={busy}
          erreur={erreur}
          onValider={(valeurs) => void dupliquer(valeurs)}
          onFermer={() => setADupliquer(false)}
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
