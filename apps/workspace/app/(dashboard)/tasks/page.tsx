"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AddOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import {
  PRIORITY_LABELS,
  PRIORITY_LEVELS,
  projectsApi,
  toneFor,
  type Task,
} from "@/app/lib/projects-api";
import { PriorityBars } from "@repo/ui/PriorityBars";
import { useSessionStore } from "@repo/auth/store/session.store";

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

  const charger = useCallback(
    () =>
      projectsApi
        .workspaceTasks({ mine: miennes, includeDone: avecTerminees })
        .then(setTaches)
        .catch(() => setTaches([])),
    [miennes, avecTerminees]
  );

  useEffect(() => {
    void charger();
  }, [charger]);

  // Regroupées par provenance : le projet, ou l'absence de projet. C'est la
  // question qu'on se pose en parcourant une liste transverse.
  const groupes = useMemo(() => {
    const carte = new Map<string, { titre: string; lien: string | null; taches: Task[] }>();
    for (const tache of taches ?? []) {
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
  }, [taches]);

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
      </div>

      {taches === null && (
        <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
      )}
      {taches?.length === 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
          {miennes ? "Rien ne vous est assigné pour l'instant." : "Aucune tâche dans ce workspace."}
        </p>
      )}

      <div className="mt-5 space-y-5">
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
                <Ligne key={tache.id} tache={tache} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Ligne({ tache }: { tache: Task }) {
  const tone = toneFor(tache.categorie);
  // Une tâche du bac n'a pas de page projet : on ouvre celle de la tâche, qui
  // existe pour toutes.
  const lien = `/projects/${tache.project_id}/tasks/${tache.id}`;
  return (
    <Link
      href={lien}
      className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition-colors"
    >
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
