"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudDoneOutlined, CloudOffOutlined, CloudSyncOutlined } from "@mui/icons-material";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { projectsApi, type Project } from "@/app/lib/projects-api";
import { useProject } from "./project-context";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 800;

export default function ProjectOverviewPage() {
  const { projectId, project, setProject, canManage } = useProject();
  const [name, setName] = useState(project.name);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const pending = useRef<Partial<Project>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const body = pending.current;
    pending.current = {};
    if (!Object.keys(body).length) return;
    setSaveState("saving");
    try {
      const updated = await projectsApi.updateProject(projectId, body);
      setProject(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [projectId, setProject]);

  const queue = useCallback(
    (patch: Partial<Project>) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  // Quitter l'aperçu (dropdown de sections) ne doit pas perdre une frappe en cours.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush],
  );

  function onNameChange(value: string) {
    setName(value);
    if (value.trim()) queue({ name: value.trim() });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-on-surface-variant">Nom du projet</label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={!canManage}
            placeholder="Nom du projet"
            className="mt-1 w-full bg-transparent text-2xl font-bold text-on-surface outline-none border-b border-transparent hover:border-outline-variant focus:border-primary transition-colors disabled:opacity-70 disabled:hover:border-transparent"
          />
          {!name.trim() && <p className="mt-1 text-xs text-error">Le nom est requis.</p>}
        </div>
        <SaveIndicator state={saveState} />
      </div>

      <div>
        <label className="text-xs font-medium text-on-surface-variant">Description</label>
        <div className="mt-2 rounded-2xl border border-outline-variant bg-surface-container-lowest px-3 py-4 min-h-[16rem]">
          <RichTextEditor
            value={project.description_rich}
            fallbackText={project.description}
            editable={canManage}
            placeholder="Décrivez le projet — tapez « / » pour les blocs…"
            onChange={canManage ? (json) => queue({ description_rich: json }) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: <CloudSyncOutlined style={{ fontSize: 16 }} />, label: "Enregistrement…", tone: "text-on-surface-variant" },
    saved: { icon: <CloudDoneOutlined style={{ fontSize: 16 }} />, label: "Enregistré", tone: "text-secondary" },
    error: { icon: <CloudOffOutlined style={{ fontSize: 16 }} />, label: "Échec de l'enregistrement", tone: "text-error" },
  } as const;
  const { icon, label, tone } = map[state];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs ${tone}`}>
      {icon}
      {label}
    </span>
  );
}
