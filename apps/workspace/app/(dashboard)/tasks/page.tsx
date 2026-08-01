"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  OpenInFullOutlined,
  ViewKanbanOutlined,
  ViewListOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  PRIORITY_LABELS,
  PRIORITY_LEVELS,
  CATEGORIE_LABELS,
  PRIORITY_ORDER,
  projectsApi,
  toneFor,
  type Etat,
  type Task,
} from "@/app/lib/projects-api";
import { PriorityBars } from "@repo/ui/PriorityBars";
import { useSessionStore } from "@repo/auth/store/session.store";
import { useRouter } from "next/navigation";

type Vue = "liste" | "kanban";

/** Colonnes du tableau : les CATÉGORIES CANONIQUES, pas les états.
 *
 *  Une vue transverse mélange des projets dont les jeux d'états diffèrent —
 *  « Livré » ici, « Terminé » là. Seule la catégorie est commune à tous, et
 *  c'est donc le seul axe sur lequel on peut aligner des colonnes. */
const CATEGORIES = ["a_faire", "en_cours", "termine", "annule"] as const;

const FIELD =
  "h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function TasksPage() {
  const user = useSessionStore((s) => s.user);
  const [taches, setTaches] = useState<Task[] | null>(null);
  const [miennes, setMiennes] = useState(true);
  const [avecTerminees, setAvecTerminees] = useState(false);
  const [titre, setTitre] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ouverte, setOuverte] = useState<Task | null>(null);
  const [vue, setVue] = useState<Vue>("liste");
  const [categorie, setCategorie] = useState<string>("");
  const [priorite, setPriorite] = useState<string>("");
  const router = useRouter();
  const [etats, setEtats] = useState<Etat[]>([]);

  const charger = useCallback(async () => {
    try {
      const liste = await projectsApi.workspaceTasks({
        mine: miennes,
        includeDone: avecTerminees,
      });
      setTaches(liste);
      // Le drawer ouvert doit suivre : sans ça il réaffiche la tâche telle
      // qu'elle était avant la modification, et le champ semble revenir en
      // arrière tout seul.
      setOuverte((prec) => (prec ? (liste.find((t) => t.id === prec.id) ?? prec) : null));
      return liste;
    } catch {
      setTaches([]);
      return [];
    }
  }, [miennes, avecTerminees]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Les états du bac : ils viennent de SON jeu, comme pour n'importe quel projet.
  // On les lit via une tâche du bac, jamais en ouvrant le projet caché.
  useEffect(() => {
    const uneDuBac = (taches ?? []).find((t) => t.sans_projet);
    if (!uneDuBac || etats.length) return;
    projectsApi.taskEtats(uneDuBac.id).then(setEtats).catch(() => {});
  }, [taches, etats.length]);

  // Les filtres s'appliquent À L'ÉCRAN : le serveur renvoie le périmètre, on
  // affine ici sans aller-retour.
  const filtrees = useMemo(
    () =>
      (taches ?? []).filter(
        (t) =>
          (!categorie || t.categorie === categorie) && (!priorite || t.priority === priorite)
      ),
    [taches, categorie, priorite]
  );

  // Regroupées par provenance : le projet, ou l'absence de projet. C'est la
  // question qu'on se pose en parcourant une liste transverse.
  const groupes = useMemo(() => {
    const carte = new Map<string, { titre: string; lien: string | null; taches: Task[] }>();
    for (const tache of filtrees) {
      const cle = tache.sans_projet ? "" : String(tache.project_id);
      if (!carte.has(cle)) {
        carte.set(cle, {
          titre: tache.sans_projet ? "Sans projet" : (tache.project_name ?? "Projet"),
          lien: tache.sans_projet ? null : `/projects/${tache.project_id}`,
          taches: [],
        });
      }
      carte.get(cle)!.taches.push(tache);
    }
    // « Sans projet » en tête : c'est le bac, ce qu'on vient noter et reprendre.
    return [...carte.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
  }, [filtrees]);

  async function creer() {
    if (!titre.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      // Sans `project_id` : la tâche rejoint le bac du workspace.
      // Assignée à soi quand on note depuis « Mes tâches » : sinon elle
      // disparaît aussitôt créée, filtrée par la vue depuis laquelle on vient.
      await projectsApi.createTask({
        title: titre.trim(),
        ...(miennes && user?.id ? { assignee_user_id: Number(user.id) } : {}),
      });
      setTitre("");
      await charger();
      setToast("Tâche créée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
      <h1 className="font-display text-headline-sm text-on-surface">Tâches</h1>
      <p className="mt-1 max-w-[60ch] text-body-sm text-on-surface-variant">
        Tout ce qui vous occupe, quel que soit le projet. Ce qui est noté ici sans projet reste
        une tâche à part entière — même état, même échéance, même suivi.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          className={`${FIELD} flex-1 min-w-[260px]`}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && creer()}
          placeholder="Noter une tâche — sans projet, on la classera plus tard…"
        />
        <button
          type="button"
          disabled={busy || !titre.trim()}
          onClick={creer}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Ajouter
        </button>
      </div>

      {erreur && (
        <p className="mt-3 text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
          {erreur}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Bascule actif={miennes} onClick={() => setMiennes(true)}>
          Mes tâches
        </Bascule>
        <Bascule actif={!miennes} onClick={() => setMiennes(false)}>
          Toutes
        </Bascule>
        <span className="mx-1 w-px h-5 bg-outline-soft" />
        <Bascule actif={avecTerminees} onClick={() => setAvecTerminees((v) => !v)}>
          Avec les terminées
        </Bascule>

        <span className="mx-1 w-px h-5 bg-outline-soft" />
        <select
          aria-label="Filtrer par statut"
          className={FIELD}
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORIE_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrer par priorité"
          className={FIELD}
          value={priorite}
          onChange={(e) => setPriorite(e.target.value)}
        >
          <option value="">Toutes les priorités</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>

        <span className="ml-auto inline-flex rounded-lg border border-outline-soft overflow-hidden">
          <BoutonVue actif={vue === "liste"} onClick={() => setVue("liste")} label="Vue liste">
            <ViewListOutlined style={{ fontSize: 17 }} />
          </BoutonVue>
          <BoutonVue actif={vue === "kanban"} onClick={() => setVue("kanban")} label="Vue kanban">
            <ViewKanbanOutlined style={{ fontSize: 17 }} />
          </BoutonVue>
        </span>
      </div>

      {taches === null && (
        <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
      )}
      {taches !== null && filtrees.length === 0 && taches.length > 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
          Aucune tâche avec ces filtres.
        </p>
      )}
      {taches?.length === 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
          {miennes ? "Rien ne vous est assigné pour l'instant." : "Aucune tâche dans ce workspace."}
        </p>
      )}

      {vue === "kanban" && filtrees.length > 0 && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
          {CATEGORIES.map((cat) => {
            const colonne = filtrees.filter((t) => t.categorie === cat);
            return (
              <section key={cat} className="rounded-2xl border border-outline-soft bg-surface-container-low p-2">
                <p className="px-1.5 py-1 text-label-sm uppercase text-outline">
                  {CATEGORIE_LABELS[cat]}
                  <span className="ml-2 text-outline-variant">{colonne.length}</span>
                </p>
                <div className="space-y-2 mt-1">
                  {colonne.map((tache) => (
                    <Carte key={tache.id} tache={tache} onOuvrir={() => setOuverte(tache)} />
                  ))}
                  {!colonne.length && (
                    <p className="px-1.5 py-3 text-label-md text-outline-variant">—</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className={`mt-5 space-y-5 ${vue === "kanban" ? "hidden" : ""}`}>
        {groupes.map(([cle, groupe]) => (
          <section key={cle}>
            <p className="mb-1.5 text-label-sm uppercase text-outline">
              {groupe.lien ? (
                <Link href={groupe.lien} className="hover:text-primary transition-colors">
                  {groupe.titre}
                </Link>
              ) : (
                groupe.titre
              )}
              <span className="ml-2 text-outline-variant">{groupe.taches.length}</span>
            </p>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
              {groupe.taches.map((tache) => (
                <Ligne key={tache.id} tache={tache} onOuvrir={() => setOuverte(tache)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {ouverte && (
        <EditeurTache
          tache={ouverte}
          etats={etats}
          onClose={() => setOuverte(null)}
          onEnregistre={async (message) => {
            await charger();
            setToast(message);
          }}
          onOuvrirEcran={() =>
            router.push(
              ouverte.sans_projet
                ? `/tasks/${ouverte.id}`
                : `/projects/${ouverte.project_id}/tasks/${ouverte.id}`
            )
          }
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

/** Édition sur place d'une tâche sans projet.
 *
 *  Elle n'a pas de page à elle : lui en donner une exposerait l'identifiant du
 *  projet caché dans l'URL, et le bac cesserait d'être inatteignable. On édite
 *  donc ici, avec les champs qui font une tâche — les mêmes que partout. */
function EditeurTache({
  tache,
  etats,
  onClose,
  onEnregistre,
  onOuvrirEcran,
}: {
  tache: Task;
  etats: Etat[];
  onClose: () => void;
  onEnregistre: (message: string) => Promise<void>;
  onOuvrirEcran: () => void;
}) {
  const [titre, setTitre] = useState(tache.title);
  const [description, setDescription] = useState(tache.description ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function appliquer(patch: Partial<Task>, message: string) {
    setBusy(true);
    setErreur(null);
    try {
      await projectsApi.updateTask(tache.id, patch);
      await onEnregistre(message);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RightDrawer
      title="Tâche"
      onClose={onClose}
      width="md:w-[460px] md:max-w-[92vw]"
      footer={
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={onOuvrirEcran}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <OpenInFullOutlined style={{ fontSize: 15 }} />
            Ouvrir la page
          </button>
          <span className="flex-1" />
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Fermer
          </button>
          <button
            disabled={busy || !titre.trim()}
            onClick={() =>
              appliquer(
                { title: titre.trim(), description: description.trim() || null },
                "Tâche enregistrée."
              ).then(onClose)
            }
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-label-sm uppercase text-outline mb-1.5">Titre</label>
          <input className={`${FIELD} w-full`} value={titre} onChange={(e) => setTitre(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-label-sm uppercase text-outline mb-1.5">État</label>
            <select
              className={`${FIELD} w-full`}
              value={tache.etat_id}
              disabled={busy || !etats.length}
              onChange={(e) => appliquer({ etat_id: Number(e.target.value) }, "État mis à jour.")}
            >
              {etats.map((etat) => (
                <option key={etat.id} value={etat.id}>
                  {etat.libelle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-label-sm uppercase text-outline mb-1.5">Priorité</label>
            <select
              className={`${FIELD} w-full`}
              value={tache.priority}
              disabled={busy}
              onChange={(e) => appliquer({ priority: e.target.value }, "Priorité mise à jour.")}
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-label-sm uppercase text-outline mb-1.5">Échéance</label>
          <input
            type="date"
            className={`${FIELD} w-[180px]`}
            value={tache.due_date ? tache.due_date.slice(0, 10) : ""}
            disabled={busy}
            onChange={(e) =>
              appliquer(
                { due_date: e.target.value ? new Date(e.target.value).toISOString() : null },
                "Échéance mise à jour."
              )
            }
          />
        </div>

        <div>
          <label className="block text-label-sm uppercase text-outline mb-1.5">Notes</label>
          <textarea
            rows={5}
            className="w-full resize-none rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ce qu'il y a à faire, le contexte, le lien utile…"
          />
        </div>

        {erreur && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{erreur}</p>
        )}
      </div>
    </RightDrawer>
  );
}

function Ligne({ tache, onOuvrir }: { tache: Task; onOuvrir: () => void }) {
  const tone = toneFor(tache.categorie);
  // Une tâche du bac n'a PAS de page : son URL exposerait le projet caché, et le
  // bac cesserait d'être inatteignable. On l'ouvre donc sur place.
  const contenu = (
    <>
      <span className={`w-[6px] h-[6px] flex-none rounded-full ${tone.dot}`} />
      <span className="min-w-0 flex-1 text-body-sm text-on-surface truncate">{tache.title}</span>
      <span className={`flex-none rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
        {tache.etat_libelle ?? "—"}
      </span>
      {tache.priority !== "AUCUNE" && (
        <span className="flex-none" title={PRIORITY_LABELS[tache.priority]}>
          <PriorityBars level={PRIORITY_LEVELS[tache.priority] ?? 0} />
        </span>
      )}
      <span className="flex-none w-[92px] text-right text-label-md text-outline">
        {fmt(tache.due_date)}
      </span>
      <span className="flex-none w-[120px] truncate text-right text-label-md text-outline">
        {tache.assignee_name ?? "Non assigné"}
      </span>
    </>
  );

  const classes =
    "flex w-full flex-wrap items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-container-low transition-colors";

  return tache.sans_projet ? (
    <button type="button" onClick={onOuvrir} className={classes}>
      {contenu}
    </button>
  ) : (
    <Link href={`/projects/${tache.project_id}/tasks/${tache.id}`} className={classes}>
      {contenu}
    </Link>
  );
}

function Bascule({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`h-8 px-3 rounded-full border text-body-sm font-medium transition-colors ${
        actif
          ? "border-primary bg-primary/10 text-primary"
          : "border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
      }`}
    >
      {children}
    </button>
  );
}

function BoutonVue({
  actif,
  onClick,
  label,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={actif}
      title={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-9 h-8 border-l border-outline-soft first:border-l-0 transition-colors ${
        actif ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
      }`}
    >
      {children}
    </button>
  );
}

/** Carte du tableau. Elle porte sa PROVENANCE : dans une vue transverse, la
 *  première question devant une tâche est « elle vient d'où ? ». */
function Carte({ tache, onOuvrir }: { tache: Task; onOuvrir: () => void }) {
  const tone = toneFor(tache.categorie);
  const contenu = (
    <>
      <span className="block text-body-sm text-on-surface">{tache.title}</span>
      <span className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-label-md text-outline">
          {tache.sans_projet ? "Sans projet" : (tache.project_name ?? "—")}
        </span>
        {tache.due_date && (
          <span className="text-label-md text-outline">
            {new Date(tache.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        )}
        {tache.priority !== "AUCUNE" && (
          <span className="ml-auto" title={PRIORITY_LABELS[tache.priority]}>
            <PriorityBars level={PRIORITY_LEVELS[tache.priority] ?? 0} />
          </span>
        )}
      </span>
    </>
  );
  const classes = `block w-full text-left rounded-xl border border-outline-soft bg-surface-container-lowest px-3 py-2.5 hover:border-primary/40 transition-colors border-l-2 ${tone.dot.replace("bg-", "border-l-")}`;

  return tache.sans_projet ? (
    <button type="button" onClick={onOuvrir} className={classes}>
      {contenu}
    </button>
  ) : (
    <Link href={`/projects/${tache.project_id}/tasks/${tache.id}`} className={classes}>
      {contenu}
    </Link>
  );
}
