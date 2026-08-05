"use client";

import { useState, FormEvent } from "react";
import { GroupOutlined, PersonOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { createWorkspace, ApiError } from "@/app/lib/api";
import type { WorkspaceType } from "@/app/lib/types";

const TYPE_OPTIONS: { value: WorkspaceType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "individual",
    label: "Individuel",
    description: "Un espace personnel, pour vous seul.",
    icon: <PersonOutlined style={{ fontSize: 20 }} />,
  },
  {
    value: "organization",
    label: "Organisation",
    description: "Un espace pour collaborer avec votre équipe.",
    icon: <GroupOutlined style={{ fontSize: 20 }} />,
  },
];

export default function NewWorkspacePage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);

  const [name, setName] = useState("");
  const [type, setType] = useState<WorkspaceType>("individual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restricted = !!activeWorkspace?.restrict_members_to_workspace && !activeWorkspace.is_owner;

  if (restricted) {
    return (
      <div className="p-8 max-w-[32rem] mx-auto">
        <h1 className="text-2xl font-bold text-on-surface">Créer un workspace</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Merci de donner un nom à votre workspace.");
      return;
    }

    setSubmitting(true);
    try {
      await createWorkspace(name.trim(), type);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-[32rem] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Créer un workspace</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Configurez votre nouvel espace de travail.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Nom du workspace</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mon-workspace"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Type de workspace</label>
          <div className="grid grid-cols-2 gap-3">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`text-left p-3 rounded-xl border transition-colors space-y-1 ${
                  type === option.value
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center gap-2 text-on-surface">
                  {option.icon}
                  <span className="text-sm font-semibold">{option.label}</span>
                </div>
                <p className="text-xs text-on-surface-variant">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Création…" : "Créer le workspace"}
        </button>
      </form>
    </div>
  );
}
