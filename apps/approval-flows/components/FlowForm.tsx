"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, DeleteOutlineOutlined, DragIndicatorOutlined } from "@mui/icons-material";
import { Checkbox } from "@repo/ui/Checkbox";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { useSessionStore } from "@repo/auth/store/session.store";
import type { FieldSchemaItem, FlowDetail, StepDef } from "@repo/approval-flows/types/flow";
import {
  createFlow,
  updateFlow,
  searchMembers,
  listGroups,
  ApiError,
  type MemberRecord,
  type GroupRecord,
} from "@/app/lib/api";

type FieldDraft = FieldSchemaItem;
type StepDraft = Omit<StepDef, "order">;

function emptyField(): FieldDraft {
  return { key: "", label: "", type: "text", required: false };
}

function emptyStep(): StepDraft {
  return {
    step_key: crypto.randomUUID(),
    name: "",
    approver_type: "specific_user",
    approver_config: {},
    approval_mode: "" as "any" | "all",
  };
}

function memberLabel(member: MemberRecord): string {
  return `${member.user.username} (${member.user.email})`;
}

function groupLabel(group: GroupRecord): string {
  return group.name;
}

export function FlowForm({
  flow,
  onSaved,
  onCancel,
}: {
  flow?: FlowDetail;
  onSaved: (flow: FlowDetail) => void;
  onCancel: () => void;
}) {
  const isEdit = !!flow;
  const activeWorkspace = useSessionStore((state) => state.activeWorkspace);
  const workspaceId = activeWorkspace?.id ?? null;

  const [id, setId] = useState(flow?.id ?? "");
  const [title, setTitle] = useState(flow?.title ?? "");
  const [description, setDescription] = useState(flow?.description ?? "");
  const [fields, setFields] = useState<FieldDraft[]>(flow?.fields_schema ?? [emptyField()]);
  const [steps, setSteps] = useState<StepDraft[]>(
    flow?.steps.map((s) => ({ ...s })) ?? [emptyStep()]
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [allGroups, setAllGroups] = useState<GroupRecord[]>([]);
  const [restrictVisibility, setRestrictVisibility] = useState(
    (flow?.visible_group_ids?.length ?? 0) > 0
  );
  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>(flow?.visible_group_ids ?? []);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (workspaceId) {
      listGroups(workspaceId).then(setAllGroups);
    }
  }, [workspaceId]);

  const fetchMembers = useCallback(
    (query: string) => (workspaceId ? searchMembers(workspaceId, query) : Promise.resolve([])),
    [workspaceId]
  );

  const fetchGroups = useCallback(
    (query: string) =>
      workspaceId
        ? listGroups(workspaceId).then((groups) =>
            query ? groups.filter((g) => g.name.toLowerCase().includes(query.toLowerCase())) : groups
          )
        : Promise.resolve([]),
    [workspaceId]
  );

  function moveStep(from: number, to: number) {
    if (from === to) return;
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function updateStep(index: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function updateStepConfig(index: number, config: Record<string, unknown>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, approver_config: config } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (steps.some((s) => s.approval_mode !== "any" && s.approval_mode !== "all")) {
      setError("Chaque étape doit avoir un mode d'approbation (any/all) explicitement choisi.");
      return;
    }
    if (steps.some((s) => s.approver_type === "specific_user" && !s.approver_config.user_id)) {
      setError("Chaque étape « Utilisateur précis » doit avoir un utilisateur sélectionné.");
      return;
    }
    if (steps.some((s) => s.approver_type === "specific_group" && !s.approver_config.group_id)) {
      setError("Chaque étape « Groupe précis » doit avoir un groupe sélectionné.");
      return;
    }
    if (restrictVisibility && visibleGroupIds.length === 0) {
      setError("Sélectionnez au moins un groupe autorisé, ou repassez en « visible par tout le workspace ».");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description: description || null,
        fields_schema: fields,
        steps,
        visible_group_ids: restrictVisibility ? visibleGroupIds : [],
      };
      const saved = isEdit ? await updateFlow(flow!.id, payload) : await createFlow({ id, ...payload });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="space-y-4">
        {!isEdit && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface">Identifiant</label>
            <input
              type="text"
              required
              placeholder="ex: achat-materiel-bureau"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            />
            <p className="text-xs text-on-surface-variant">
              Sera normalisé en slug à la création.
            </p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Titre</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Description</label>
          <textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface">Champs du formulaire de soumission</h3>
          <button
            type="button"
            onClick={() => setFields((prev) => [...prev, emptyField()])}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter un champ
          </button>
        </div>

        {fields.map((field, index) => (
          <div key={index} className="flex items-end gap-2 rounded-xl border border-outline-variant p-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-on-surface-variant">Clé</label>
              <input
                type="text"
                required
                value={field.key}
                onChange={(e) => updateField(index, { key: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-on-surface-variant">Libellé</label>
              <input
                type="text"
                required
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Type</label>
              <select
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as FieldDraft["type"] })}
                className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              >
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="date">Date</option>
                <option value="attachment">Pièce jointe</option>
              </select>
            </div>
            <Checkbox
              checked={field.required}
              onChange={(checked) => updateField(index, { required: checked })}
              label="Requis"
            />
            <button
              type="button"
              onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
              className="text-on-surface-variant hover:text-error"
            >
              <DeleteOutlineOutlined style={{ fontSize: 18 }} />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface">Étapes d&apos;approbation (séquentielles)</h3>
          <button
            type="button"
            onClick={() => setSteps((prev) => [...prev, emptyStep()])}
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter une étape
          </button>
        </div>

        {steps.map((step, index) => (
          <div
            key={step.step_key}
            draggable
            onDragStart={() => setDraggedIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedIndex !== null) moveStep(draggedIndex, index);
              setDraggedIndex(null);
            }}
            onDragEnd={() => setDraggedIndex(null)}
            className={`space-y-2 rounded-xl border border-outline-variant p-3 ${
              draggedIndex === index ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant cursor-grab active:cursor-grabbing" title="Glisser pour réordonner">
                <DragIndicatorOutlined style={{ fontSize: 18 }} />
              </span>
              <span className="text-xs font-medium text-on-surface-variant w-6">{index + 1}.</span>
              <input
                type="text"
                required
                placeholder="Nom (ex: Approbation manager)"
                value={step.name}
                onChange={(e) => updateStep(index, { name: e.target.value })}
                className="flex-1 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              />
              <button
                type="button"
                onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                className="text-on-surface-variant hover:text-error"
              >
                <DeleteOutlineOutlined style={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="flex items-center gap-2 pl-8">
              <select
                value={step.approver_type}
                onChange={(e) => {
                  const approver_type = e.target.value as StepDraft["approver_type"];
                  updateStep(index, { approver_type });
                  updateStepConfig(
                    index,
                    approver_type === "criteria" ? { criterion: "hierarchical_superior" } : {}
                  );
                }}
                className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              >
                <option value="specific_user">Utilisateur précis</option>
                <option value="specific_group">Groupe précis</option>
                <option value="criteria">Critère</option>
              </select>

              {step.approver_type === "specific_user" && (
                <div className="w-64">
                  <SearchSelect<MemberRecord>
                    fetchOptions={fetchMembers}
                    value={(step.approver_config.user_id as number) ?? null}
                    onChange={(value) => updateStepConfig(index, { user_id: value as number })}
                    getOptionLabel={memberLabel}
                    getOptionValue={(member) => member.user.id}
                    initialLabel={
                      step.approver_config.user_id
                        ? `Utilisateur #${step.approver_config.user_id}`
                        : undefined
                    }
                    placeholder="Rechercher un utilisateur…"
                  />
                </div>
              )}

              {step.approver_type === "specific_group" && (
                <div className="w-64">
                  <SearchSelect<GroupRecord>
                    fetchOptions={fetchGroups}
                    value={(step.approver_config.group_id as number) ?? null}
                    onChange={(value) => updateStepConfig(index, { group_id: value as number })}
                    getOptionLabel={groupLabel}
                    initialLabel={
                      step.approver_config.group_id
                        ? `Groupe #${step.approver_config.group_id}`
                        : undefined
                    }
                    placeholder="Rechercher un groupe…"
                  />
                </div>
              )}

              {step.approver_type === "criteria" && (
                <>
                  <select
                    value={(step.approver_config.criterion as string) ?? "hierarchical_superior"}
                    onChange={(e) =>
                      updateStepConfig(
                        index,
                        e.target.value === "role_label"
                          ? { criterion: "role_label", label: step.approver_config.label ?? "" }
                          : { criterion: e.target.value }
                      )
                    }
                    className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                  >
                    <option value="hierarchical_superior">Supérieur hiérarchique direct</option>
                    <option value="role_label">Étiquette de rôle (binding requis)</option>
                  </select>
                  {step.approver_config.criterion === "role_label" && (
                    <input
                      type="text"
                      required
                      placeholder="Étiquette (ex: Responsable RH)"
                      value={(step.approver_config.label as string) ?? ""}
                      onChange={(e) =>
                        updateStepConfig(index, { criterion: "role_label", label: e.target.value })
                      }
                      className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm w-56"
                    />
                  )}
                </>
              )}

              <select
                required
                value={step.approval_mode}
                onChange={(e) => updateStep(index, { approval_mode: e.target.value as StepDraft["approval_mode"] })}
                className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              >
                <option value="" disabled>
                  Mode d&apos;approbation…
                </option>
                <option value="any">N&apos;importe quel approbateur (any)</option>
                <option value="all">Tous les approbateurs (all)</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-on-surface">Accessibilité</h3>
        <Checkbox
          checked={!restrictVisibility}
          onChange={(checked) => {
            setRestrictVisibility(!checked);
            if (checked) setVisibleGroupIds([]);
          }}
          label="Visible par tout le workspace"
        />
        {restrictVisibility && (
          <div className="space-y-1">
            <label className="text-xs text-on-surface-variant">
              Groupes autorisés à voir et soumettre ce flow
            </label>
            <MultiSelect
              options={allGroups.map((g) => ({ id: g.id, label: g.name }))}
              selectedIds={visibleGroupIds}
              onChange={(ids) => setVisibleGroupIds(ids as number[])}
              placeholder="Rechercher un groupe…"
              emptyLabel="Aucun groupe trouvé."
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
