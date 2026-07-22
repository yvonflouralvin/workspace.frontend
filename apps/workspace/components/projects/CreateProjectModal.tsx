"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@repo/ui/Modal";
import { projectsApi, type Project } from "@/app/lib/projects-api";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-md font-semibold text-on-surface mb-1.5";

export function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSaving(true);
    try {
      const project = await projectsApi.createProject({
        name: name.trim(),
        key: key.trim() || name.trim(),
        description: description.trim() || undefined,
      });
      onCreated(project);
      onClose();
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nouveau projet"
      onClose={onClose}
      width="max-w-[36rem]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-[38px] px-4 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => submit()}
            disabled={saving}
            className="ml-auto h-[38px] px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {saving ? "Création…" : "Créer"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className={LABEL}>Nom *</label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Refonte du site"
            className={`${FIELD} h-[38px] px-3`}
          />
        </div>

        <div>
          <label className={LABEL}>Clé (préfixe des tâches)</label>
          <input
            type="text"
            value={key}
            maxLength={12}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="WEB"
            className={`${FIELD} h-[38px] px-3 font-mono uppercase`}
          />
        </div>

        <div>
          <label className={LABEL}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${FIELD} px-3 py-2.5 resize-none`}
          />
        </div>
      </form>
    </Modal>
  );
}
