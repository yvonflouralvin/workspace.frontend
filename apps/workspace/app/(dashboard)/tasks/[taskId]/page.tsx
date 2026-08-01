"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { TagInput } from "@repo/ui/TagInput";
import { Toast } from "@repo/ui/Toast";
import { FilCommentaires } from "@/components/projects/FilCommentaires";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  projectsApi,
  toneFor,
  type Etat,
  type Task,
} from "@/app/lib/projects-api";

const CONTROL =
  "h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary";
const LABEL = "block text-label-sm uppercase text-outline";

/** L'écran d'une tâche SANS projet.
 *
 *  Une tâche du bac ne peut pas emprunter la page d'un projet : l'URL exposerait
 *  l'identifiant du projet caché. Elle a donc son écran propre, à l'échelle du
 *  workspace. Une tâche qui appartient à un vrai projet est renvoyée vers le
 *  sien — il porte davantage : phase, itération, livrables.
 */
export default function TacheWorkspacePage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const id = Number(taskId);

  const [tache, setTache] = useState<Task | null>(null);
  const [etats, setEtats] = useState<Etat[]>([]);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [introuvable, setIntrouvable] = useState(false);

  const charger = useCallback(async () => {
    const lue = await projectsApi.getTask(id);
    if (!lue.sans_projet) {
      // Elle a un projet : c'est là qu'elle se gère, avec sa phase et ses livrables.
      router.replace(`/projects/${lue.project_id}/tasks/${lue.id}`);
      return;
    }
    setTache(lue);
    setTitre(lue.title);
    setDescription(lue.description ?? "");
  }, [id, router]);

  useEffect(() => {
    charger().catch(() => setIntrouvable(true));
    projectsApi.taskEtats(id).then(setEtats).catch(() => {});
  }, [charger, id]);

  async function appliquer(patch: Partial<Task>, message: string) {
    setErreur(null);
    try {
      const mise = await projectsApi.updateTask(id, patch);
      setTache(mise);
      setToast(message);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  }

  if (introuvable) {
    return (
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-4">
        <Retour />
        <p className="text-body-md text-error">Tâche introuvable.</p>
      </div>
    );
  }
  if (!tache) {
    return <p className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</p>;
  }

  const tone = toneFor(tache.categorie);

  return (
    <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
      <Retour />

      {/* Sur sa propre ligne : collé au lien de retour, il se lisait comme la
          suite du fil d'Ariane. */}
      <p className="text-label-md font-medium text-outline">Sans projet</p>
      <input
        aria-label="Titre de la tâche"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        onBlur={() => {
          const valeur = titre.trim();
          if (valeur && valeur !== tache.title) void appliquer({ title: valeur }, "Titre enregistré.");
        }}
        className="mt-0.5 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
      />

      {erreur && (
        <p className="mt-3 text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
          {erreur}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div>
          <p className={`${LABEL} mb-2`}>Notes</p>
          <textarea
            rows={12}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (tache.description ?? "")) {
                void appliquer({ description: description || null }, "Notes enregistrées.");
              }
            }}
            placeholder="Ce qu'il y a à faire, le contexte, le lien utile…"
            className="w-full resize-none rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          />

          <div className="mt-6">
            <FilCommentaires taskId={tache.id} canWrite />
          </div>
        </div>

        <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
          <Ligne label="État">
            <select
              className={CONTROL}
              value={tache.etat_id}
              disabled={!etats.length}
              onChange={(e) => appliquer({ etat_id: Number(e.target.value) }, "État mis à jour.")}
            >
              {etats.map((etat) => (
                <option key={etat.id} value={etat.id}>
                  {etat.libelle}
                </option>
              ))}
            </select>
          </Ligne>

          <Ligne label="Priorité">
            <select
              className={CONTROL}
              value={tache.priority}
              onChange={(e) => appliquer({ priority: e.target.value }, "Priorité mise à jour.")}
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </Ligne>

          <Ligne label="Échéance">
            <input
              type="date"
              className={CONTROL}
              value={tache.due_date ? tache.due_date.slice(0, 10) : ""}
              onChange={(e) =>
                appliquer(
                  { due_date: e.target.value ? new Date(e.target.value).toISOString() : null },
                  "Échéance mise à jour."
                )
              }
            />
          </Ligne>

          <Ligne label="Catégorie">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
              <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
              {tache.etat_libelle ?? "—"}
            </span>
          </Ligne>

          <div className="px-4 py-3">
            <p className="text-body-sm text-on-surface-variant mb-1.5">Étiquettes</p>
            <TagInput
              value={tache.tags ?? []}
              onChange={(tags) => appliquer({ tags }, "Étiquettes enregistrées.")}
              placeholder="Perso, Urgent…"
            />
          </div>
        </aside>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Retour() {
  return (
    <Link
      href="/tasks"
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Tâches
    </Link>
  );
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}
