"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AddOutlined,
  DeleteOutlineOutlined,
  DragIndicatorOutlined,
  EditOutlined,
  LockOutlined,
  RestartAltOutlined,
} from "@mui/icons-material";
import { Checkbox } from "@repo/ui/Checkbox";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { useSessionStore } from "@repo/auth/store/session.store";
import type { FieldSchemaItem, FlowDetail, StepDef, VersionDetail } from "@repo/approval-flows/types/flow";
import {
  createFlow,
  createVersion,
  publishVersion,
  updateFlow,
  updateVersion,
  searchMembers,
  listGroups,
  ApiError,
  type MemberRecord,
  type GroupRecord,
} from "@/app/lib/api";

type FieldDraft = FieldSchemaItem;
type StepDraft = Omit<StepDef, "order">;

type DrawerState =
  | { kind: "field-edit"; index: number }
  | { kind: "field-view"; field: FieldSchemaItem }
  | { kind: "step-edit"; index: number }
  | { kind: "step-view"; step: StepDef }
  | null;

const FIELD_TYPE_LABEL: Record<FieldDraft["type"], string> = {
  text_short: "Texte court",
  text_long: "Texte long",
  number: "Nombre",
  date: "Date",
  attachment: "Pièce jointe",
  single_choice: "Liste (choix unique)",
  multi_choice: "Choix multiple",
};

function needsOptions(type: FieldDraft["type"]): boolean {
  return type === "single_choice" || type === "multi_choice";
}

function isFieldRestricted(field: FieldDraft | FieldSchemaItem): boolean {
  return (field.visible_user_ids?.length ?? 0) > 0 || (field.visible_group_ids?.length ?? 0) > 0;
}

function emptyField(): FieldDraft {
  return {
    key: crypto.randomUUID(),
    label: "",
    description: "",
    type: "text_short",
    required: false,
    options: [],
    visible_user_ids: [],
    visible_group_ids: [],
  };
}

// Anciennes données ("text", avant le découpage texte court/long) — traitées comme
// "text_short" plutôt que de forcer une migration de données dev.
function normalizeField(field: FieldDraft): FieldDraft {
  return (field.type as string) === "text"
    ? { ...field, type: "text_short" }
    : field;
}

function emptyStep(): StepDraft {
  return {
    step_key: crypto.randomUUID(),
    name: "",
    approver_type: "specific_user",
    approver_config: {},
    approval_mode: "any",
    on_reject_restart_form: true,
  };
}

// Seul "Groupe précis" peut résoudre à plusieurs approbateurs — c'est le seul cas où
// any/all est un choix réel. Les autres types résolvent à 0 ou 1 approbateur, le mode
// est donc forcé à "any" et le select n'est pas affiché.
function needsApprovalModeChoice(approverType: StepDraft["approver_type"]): boolean {
  return approverType === "specific_group";
}

function memberLabel(member: MemberRecord): string {
  return `${member.user.username} (${member.user.email})`;
}

function groupLabel(group: GroupRecord): string {
  return group.name;
}

// État local distinct (plutôt que dérivé de visible_user_ids/visible_group_ids) pour
// que décocher "visible par tout le monde" affiche immédiatement les sélecteurs avant
// toute sélection — `key={field.key}` côté appelant réinitialise cet état par champ.
function FieldVisibilityEditor({
  field,
  onChange,
  allMembers,
  allGroups,
}: {
  field: FieldDraft;
  onChange: (patch: Partial<FieldDraft>) => void;
  allMembers: MemberRecord[];
  allGroups: GroupRecord[];
}) {
  const [restrict, setRestrict] = useState(isFieldRestricted(field));

  return (
    <div className="space-y-3">
      <Checkbox
        checked={!restrict}
        onChange={(checked) => {
          setRestrict(!checked);
          if (checked) onChange({ visible_user_ids: [], visible_group_ids: [] });
        }}
        label="Visible par tout le monde"
        description="Une fois la demande soumise, qui peut voir la valeur remplie pour ce champ."
      />
      {restrict && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-on-surface-variant">Utilisateurs autorisés</label>
            <MultiSelect
              options={allMembers.map((m) => ({ id: m.user.id, label: memberLabel(m) }))}
              selectedIds={field.visible_user_ids ?? []}
              onChange={(ids) => onChange({ visible_user_ids: ids as number[] })}
              placeholder="Rechercher un utilisateur…"
              emptyLabel="Aucun utilisateur trouvé."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-on-surface-variant">Groupes autorisés</label>
            <MultiSelect
              options={allGroups.map((g) => ({ id: g.id, label: g.name }))}
              selectedIds={field.visible_group_ids ?? []}
              onChange={(ids) => onChange({ visible_group_ids: ids as number[] })}
              placeholder="Rechercher un groupe…"
              emptyLabel="Aucun groupe trouvé."
            />
          </div>
        </>
      )}
    </div>
  );
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
  const activeWorkspace = useSessionStore((state) => state.activeWorkspace);
  const workspaceId = activeWorkspace?.id ?? null;

  // workspace_id null = pas encore de ligne ApprovalFlow dans ce workspace (template
  // d'app jamais configuré, ou tout premier flow libre) — createFlow à appeler plutôt
  // que les endpoints de version.
  const isNewFlow = !flow || flow.workspace_id === null;
  const draft = flow?.draft_version ?? null;
  const published = flow?.published_version ?? null;
  const hasPublished = !!published;
  // Base du buffer éditable : le brouillon s'il existe, sinon la version publiée
  // (point de départ d'un futur brouillon), sinon le contenu suggéré par le template.
  const sourceVersion: VersionDetail | null = draft ?? published ?? null;

  const [activeTab, setActiveTab] = useState<"published" | "draft">(draft ? "draft" : "published");

  const [id, setId] = useState(flow?.id ?? "");
  const [title, setTitle] = useState(sourceVersion?.title ?? flow?.suggested_title ?? "");
  const [description, setDescription] = useState(
    sourceVersion?.description ?? flow?.suggested_description ?? ""
  );
  const [fields, setFields] = useState<FieldDraft[]>(
    (sourceVersion?.fields_schema ?? flow?.suggested_fields_schema ?? []).map(normalizeField)
  );
  const [steps, setSteps] = useState<StepDraft[]>(
    sourceVersion?.steps.map((s) => ({ ...s })) ??
      flow?.suggested_steps?.map((s) => ({ ...s })) ?? [emptyStep()]
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [allGroups, setAllGroups] = useState<GroupRecord[]>([]);
  const [allMembers, setAllMembers] = useState<MemberRecord[]>([]);
  const [restrictVisibility, setRestrictVisibility] = useState(
    (flow?.visible_group_ids?.length ?? 0) > 0
  );
  const [visibleGroupIds, setVisibleGroupIds] = useState<number[]>(flow?.visible_group_ids ?? []);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);

  // Resynchronise le buffer local seulement quand la version source change réellement
  // (publication, nouveau brouillon créé…) — pas à chaque re-render du parent.
  useEffect(() => {
    setId(flow?.id ?? "");
    setTitle(sourceVersion?.title ?? flow?.suggested_title ?? "");
    setDescription(sourceVersion?.description ?? flow?.suggested_description ?? "");
    setFields((sourceVersion?.fields_schema ?? flow?.suggested_fields_schema ?? []).map(normalizeField));
    setSteps(
      sourceVersion?.steps.map((s) => ({ ...s })) ??
        flow?.suggested_steps?.map((s) => ({ ...s })) ?? [emptyStep()]
    );
    setRestrictVisibility((flow?.visible_group_ids?.length ?? 0) > 0);
    setVisibleGroupIds(flow?.visible_group_ids ?? []);
    setActiveTab(draft ? "draft" : "published");
    setDrawer(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow?.id, draft?.id, published?.id]);

  useEffect(() => {
    if (workspaceId) {
      listGroups(workspaceId).then(setAllGroups);
      // Annuaire complet (pas une recherche) — sert uniquement à résoudre les noms
      // affichés (lecture seule + valeur déjà sélectionnée), pas le dropdown de
      // recherche lui-même (`fetchMembers` ci-dessous, qui filtre côté service).
      searchMembers(workspaceId, "", 100).then(setAllMembers);
    }
  }, [workspaceId]);

  function memberDisplayName(userId: number | undefined): string {
    if (!userId) return "Utilisateur non défini";
    const member = allMembers.find((m) => m.user.id === userId);
    return member ? memberLabel(member) : `Utilisateur #${userId}`;
  }

  function groupDisplayName(groupId: number | undefined): string {
    if (!groupId) return "Groupe non défini";
    const group = allGroups.find((g) => g.id === groupId);
    return group ? group.name : `Groupe #${groupId}`;
  }

  function approverSummary(step: StepDef | StepDraft): string {
    if (step.approver_type === "specific_user") {
      return memberDisplayName(step.approver_config.user_id as number | undefined);
    }
    if (step.approver_type === "specific_group") {
      const mode = step.approval_mode === "all" ? "tous" : "n'importe lequel";
      return `${groupDisplayName(step.approver_config.group_id as number | undefined)} (${mode})`;
    }
    if (step.approver_config.criterion === "role_label") {
      return `Rôle — ${groupDisplayName(step.approver_config.group_id as number | undefined)}`;
    }
    return "Supérieur hiérarchique direct";
  }

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

  function moveField(from: number, to: number) {
    if (from === to) return;
    setFields((prev) => {
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

  function addField() {
    const index = fields.length;
    setFields((prev) => [...prev, emptyField()]);
    setDrawer({ kind: "field-edit", index });
  }

  function addStep() {
    const index = steps.length;
    setSteps((prev) => [...prev, emptyStep()]);
    setDrawer({ kind: "step-edit", index });
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
    if (drawer?.kind === "field-edit" && drawer.index === index) setDrawer(null);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    if (drawer?.kind === "step-edit" && drawer.index === index) setDrawer(null);
  }

  async function handlePublish() {
    if (!flow || !draft) return;
    setError(null);
    setInfo(null);
    setPublishing(true);
    try {
      const publishedVersion = await publishVersion(flow.id, draft.id);
      onSaved({ ...flow, published_version: publishedVersion, draft_version: null, configured: true });
      setActiveTab("published");
      setInfo("Version publiée.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (steps.length === 0) {
      setError("Un flow doit avoir au moins une étape d'approbation.");
      return;
    }
    if (fields.some((f) => needsOptions(f.type) && (f.options ?? []).filter((o) => o.trim()).length === 0)) {
      setError("Chaque champ « Liste » ou « Choix multiple » doit avoir au moins une option.");
      return;
    }
    if (
      steps.some(
        (s) => needsApprovalModeChoice(s.approver_type) && s.approval_mode !== "any" && s.approval_mode !== "all"
      )
    ) {
      setError("Chaque étape « Groupe précis » doit avoir un mode d'approbation (any/all) explicitement choisi.");
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
    if (
      steps.some(
        (s) =>
          s.approver_type === "criteria" &&
          s.approver_config.criterion === "role_label" &&
          !s.approver_config.group_id
      )
    ) {
      setError("Chaque étape « Rôle » doit avoir un groupe sélectionné.");
      return;
    }
    if (restrictVisibility && visibleGroupIds.length === 0) {
      setError("Sélectionnez au moins un groupe autorisé, ou repassez en « visible par tout le workspace ».");
      return;
    }

    setSubmitting(true);
    try {
      const normalizedSteps = steps.map((s) =>
        needsApprovalModeChoice(s.approver_type) ? s : { ...s, approval_mode: "any" as const }
      );
      const content = {
        title,
        description: description || null,
        fields_schema: fields,
        steps: normalizedSteps,
      };

      let saved: FlowDetail;
      if (isNewFlow) {
        saved = await createFlow({
          id,
          ...content,
          visible_group_ids: restrictVisibility ? visibleGroupIds : [],
        });
      } else {
        await updateFlow(flow!.id, { visible_group_ids: restrictVisibility ? visibleGroupIds : [] });
        if (draft) {
          const updated = await updateVersion(flow!.id, draft.id, content);
          saved = { ...flow!, draft_version: updated };
        } else {
          // Pas de brouillon en cours (flow déjà configuré, version publiée
          // affichée en lecture seule sur l'autre onglet) — "Enregistrer" depuis
          // l'onglet Brouillon en crée un.
          const created = await createVersion(flow!.id, content);
          saved = { ...flow!, draft_version: created, has_draft: true };
        }
      }
      setActiveTab("draft");
      setInfo("Enregistré.");
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {flow && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface-container text-on-surface-variant">
            {hasPublished ? "Publié" : draft ? "Brouillon" : "Non configuré"}
          </span>
          {!isNewFlow && (
            <span className="text-xs text-on-surface-variant">Identifiant : {flow.id}</span>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}
      {info && (
        <p className="text-sm text-on-surface bg-surface-container rounded-lg px-3 py-2">{info}</p>
      )}

      {hasPublished && (
        <div className="flex gap-1 border-b border-outline-variant">
          <button
            type="button"
            onClick={() => setActiveTab("published")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "published"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Version publiée
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("draft")}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "draft"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Brouillon{draft ? "" : " (à créer)"}
          </button>
        </div>
      )}

      {hasPublished && activeTab === "published" ? (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-on-surface">{published!.title}</h3>
            {published!.description && (
              <p className="text-sm text-on-surface-variant mt-1">{published!.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-on-surface">Champs du formulaire de soumission</h4>
            {published!.fields_schema.length === 0 && (
              <p className="text-sm text-on-surface-variant">Aucun champ.</p>
            )}
            {published!.fields_schema.map(normalizeField).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDrawer({ kind: "field-view", field: f })}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-outline-variant p-3 text-sm text-left hover:bg-surface-container transition-colors"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-on-surface">{f.label}</span>
                  <span className="text-on-surface-variant"> — {FIELD_TYPE_LABEL[f.type]}{f.required ? " · requis" : ""}</span>
                </span>
                {isFieldRestricted(f) && (
                  <LockOutlined style={{ fontSize: 16 }} className="text-on-surface-variant flex-shrink-0" titleAccess="Visibilité restreinte" />
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-on-surface">Étapes d&apos;approbation</h4>
            {published!.steps.map((s, i) => (
              <button
                key={s.step_key}
                type="button"
                onClick={() => setDrawer({ kind: "step-view", step: s })}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-outline-variant p-3 text-sm text-left hover:bg-surface-container transition-colors"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-on-surface">
                    {i + 1}. {s.name}
                  </span>
                  <span className="text-on-surface-variant"> — {approverSummary(s)}</span>
                </span>
                {!s.on_reject_restart_form && (
                  <RestartAltOutlined style={{ fontSize: 16 }} className="text-on-surface-variant flex-shrink-0" titleAccess="Rejet souple" />
                )}
              </button>
            ))}
          </div>

          <p className="text-xs text-on-surface-variant">
            Lecture seule — passez à l&apos;onglet « Brouillon » pour modifier ce flow.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {!flow && (
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
                onClick={addField}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter un champ
              </button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.key}
                draggable
                onDragStart={() => setDraggedFieldIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedFieldIndex !== null) moveField(draggedFieldIndex, index);
                  setDraggedFieldIndex(null);
                }}
                onDragEnd={() => setDraggedFieldIndex(null)}
                className={`flex items-center gap-2 rounded-xl border border-outline-variant p-3 ${
                  draggedFieldIndex === index ? "opacity-50" : ""
                }`}
              >
                <span
                  className="text-on-surface-variant cursor-grab active:cursor-grabbing"
                  title="Glisser pour réordonner"
                >
                  <DragIndicatorOutlined style={{ fontSize: 18 }} />
                </span>
                <button
                  type="button"
                  onClick={() => setDrawer({ kind: "field-edit", index })}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left text-sm"
                >
                  <span className="font-medium text-on-surface truncate">
                    {field.label || "Sans libellé"}
                  </span>
                  <span className="text-xs text-on-surface-variant flex-shrink-0">
                    {FIELD_TYPE_LABEL[field.type]}
                    {field.required ? " · requis" : ""}
                  </span>
                  {isFieldRestricted(field) && (
                    <LockOutlined style={{ fontSize: 16 }} className="text-on-surface-variant flex-shrink-0" titleAccess="Visibilité restreinte" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer({ kind: "field-edit", index })}
                  className="text-on-surface-variant hover:text-primary"
                  title="Modifier"
                >
                  <EditOutlined style={{ fontSize: 18 }} />
                </button>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="text-on-surface-variant hover:text-error"
                  title="Supprimer"
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
                onClick={addStep}
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
                className={`flex items-center gap-2 rounded-xl border border-outline-variant p-3 ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                <span className="text-on-surface-variant cursor-grab active:cursor-grabbing" title="Glisser pour réordonner">
                  <DragIndicatorOutlined style={{ fontSize: 18 }} />
                </span>
                <span className="text-xs font-medium text-on-surface-variant w-6">{index + 1}.</span>
                <button
                  type="button"
                  onClick={() => setDrawer({ kind: "step-edit", index })}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left text-sm"
                >
                  <span className="font-medium text-on-surface truncate">
                    {step.name || "Sans nom"}
                  </span>
                  <span className="text-xs text-on-surface-variant truncate">{approverSummary(step)}</span>
                  {!step.on_reject_restart_form && (
                    <RestartAltOutlined style={{ fontSize: 16 }} className="text-on-surface-variant flex-shrink-0" titleAccess="Rejet souple" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawer({ kind: "step-edit", index })}
                  className="text-on-surface-variant hover:text-primary"
                  title="Modifier"
                >
                  <EditOutlined style={{ fontSize: 18 }} />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="text-on-surface-variant hover:text-error"
                  title="Supprimer"
                >
                  <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                </button>
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
              Retour
            </button>
            {!isNewFlow && draft && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || submitting}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-primary text-primary disabled:opacity-50"
              >
                {publishing ? "Publication…" : "Publier"}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}

      {drawer?.kind === "field-edit" && fields[drawer.index] && (
        <RightDrawer title="Modifier le champ" onClose={() => setDrawer(null)}>
          <div className="space-y-4 overflow-y-auto h-full pb-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-on-surface-variant">Libellé</label>
                <input
                  type="text"
                  required
                  value={fields[drawer.index].label}
                  onChange={(e) => updateField(drawer.index, { label: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-on-surface-variant">Type</label>
                <select
                  value={fields[drawer.index].type}
                  onChange={(e) => {
                    const type = e.target.value as FieldDraft["type"];
                    updateField(drawer.index, {
                      type,
                      options: needsOptions(type) ? fields[drawer.index].options ?? [] : undefined,
                    });
                  }}
                  className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                >
                  <option value="text_short">Texte court</option>
                  <option value="text_long">Texte long</option>
                  <option value="number">Nombre</option>
                  <option value="date">Date</option>
                  <option value="attachment">Pièce jointe</option>
                  <option value="single_choice">Liste (choix unique)</option>
                  <option value="multi_choice">Choix multiple</option>
                </select>
              </div>
              <Checkbox
                checked={fields[drawer.index].required}
                onChange={(checked) => updateField(drawer.index, { required: checked })}
                label="Requis"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Description (optionnel)</label>
              <input
                type="text"
                placeholder="Aide affichée sous le champ au moment de la soumission"
                value={fields[drawer.index].description ?? ""}
                onChange={(e) => updateField(drawer.index, { description: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              />
            </div>

            {needsOptions(fields[drawer.index].type) && (
              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant">Options</label>
                {(fields[drawer.index].options ?? []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={option}
                      onChange={(e) =>
                        updateField(drawer.index, {
                          options: (fields[drawer.index].options ?? []).map((o, i) =>
                            i === optionIndex ? e.target.value : o
                          ),
                        })
                      }
                      className="flex-1 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(drawer.index, {
                          options: (fields[drawer.index].options ?? []).filter((_, i) => i !== optionIndex),
                        })
                      }
                      className="text-on-surface-variant hover:text-error"
                    >
                      <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateField(drawer.index, { options: [...(fields[drawer.index].options ?? []), ""] })
                  }
                  className="flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <AddOutlined style={{ fontSize: 14 }} />
                  Ajouter une option
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-outline-variant space-y-2">
              <h4 className="text-sm font-semibold text-on-surface">Visibilité après soumission</h4>
              <FieldVisibilityEditor
                key={fields[drawer.index].key}
                field={fields[drawer.index]}
                onChange={(patch) => updateField(drawer.index, patch)}
                allMembers={allMembers}
                allGroups={allGroups}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDrawer(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary"
              >
                Fermer
              </button>
            </div>
          </div>
        </RightDrawer>
      )}

      {drawer?.kind === "field-view" && (
        <RightDrawer title="Détail du champ" onClose={() => setDrawer(null)}>
          <div className="space-y-3 text-sm overflow-y-auto h-full pb-4">
            <div>
              <p className="font-medium text-on-surface">{drawer.field.label}</p>
              <p className="text-on-surface-variant">
                {FIELD_TYPE_LABEL[drawer.field.type]}
                {drawer.field.required ? " · requis" : ""}
              </p>
            </div>
            {drawer.field.description && (
              <p className="text-xs text-on-surface-variant">{drawer.field.description}</p>
            )}
            {needsOptions(drawer.field.type) && (drawer.field.options?.length ?? 0) > 0 && (
              <p className="text-xs text-on-surface-variant">
                Options : {drawer.field.options!.join(", ")}
              </p>
            )}
            <div className="pt-2 border-t border-outline-variant">
              <p className="text-xs font-medium text-on-surface-variant mb-1">Visibilité après soumission</p>
              {!isFieldRestricted(drawer.field) ? (
                <p className="text-xs text-on-surface-variant">Visible par tout le monde.</p>
              ) : (
                <div className="text-xs text-on-surface-variant space-y-1">
                  {(drawer.field.visible_user_ids?.length ?? 0) > 0 && (
                    <p>
                      Utilisateurs :{" "}
                      {drawer.field.visible_user_ids!.map((id) => memberDisplayName(id)).join(", ")}
                    </p>
                  )}
                  {(drawer.field.visible_group_ids?.length ?? 0) > 0 && (
                    <p>
                      Groupes :{" "}
                      {drawer.field.visible_group_ids!.map((id) => groupDisplayName(id)).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </RightDrawer>
      )}

      {drawer?.kind === "step-edit" && steps[drawer.index] && (
        <RightDrawer title="Modifier l'étape" onClose={() => setDrawer(null)}>
          <div className="space-y-4 overflow-y-auto h-full pb-4">
            <div className="space-y-1">
              <label className="text-xs text-on-surface-variant">Nom</label>
              <input
                type="text"
                required
                placeholder="ex: Approbation manager"
                value={steps[drawer.index].name}
                onChange={(e) => updateStep(drawer.index, { name: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={steps[drawer.index].approver_type}
                onChange={(e) => {
                  const approver_type = e.target.value as StepDraft["approver_type"];
                  updateStep(drawer.index, {
                    approver_type,
                    approval_mode: needsApprovalModeChoice(approver_type) ? ("" as "any" | "all") : "any",
                  });
                  updateStepConfig(
                    drawer.index,
                    approver_type === "criteria" ? { criterion: "hierarchical_superior" } : {}
                  );
                }}
                className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
              >
                <option value="specific_user">Utilisateur précis</option>
                <option value="specific_group">Groupe précis</option>
                <option value="criteria">Critère</option>
              </select>

              {steps[drawer.index].approver_type === "specific_user" && (
                <div className="w-64">
                  <SearchSelect<MemberRecord>
                    fetchOptions={fetchMembers}
                    value={(steps[drawer.index].approver_config.user_id as number) ?? null}
                    onChange={(value) => updateStepConfig(drawer.index, { user_id: value as number })}
                    getOptionLabel={memberLabel}
                    getOptionValue={(member) => member.user.id}
                    initialLabel={
                      steps[drawer.index].approver_config.user_id
                        ? memberDisplayName(steps[drawer.index].approver_config.user_id as number)
                        : undefined
                    }
                    placeholder="Rechercher un utilisateur…"
                  />
                </div>
              )}

              {steps[drawer.index].approver_type === "specific_group" && (
                <div className="w-64">
                  <SearchSelect<GroupRecord>
                    fetchOptions={fetchGroups}
                    value={(steps[drawer.index].approver_config.group_id as number) ?? null}
                    onChange={(value) => updateStepConfig(drawer.index, { group_id: value as number })}
                    getOptionLabel={groupLabel}
                    initialLabel={
                      steps[drawer.index].approver_config.group_id
                        ? groupDisplayName(steps[drawer.index].approver_config.group_id as number)
                        : undefined
                    }
                    placeholder="Rechercher un groupe…"
                  />
                </div>
              )}

              {steps[drawer.index].approver_type === "criteria" && (
                <>
                  <select
                    value={(steps[drawer.index].approver_config.criterion as string) ?? "hierarchical_superior"}
                    onChange={(e) =>
                      updateStepConfig(
                        drawer.index,
                        e.target.value === "role_label"
                          ? { criterion: "role_label", group_id: steps[drawer.index].approver_config.group_id }
                          : { criterion: e.target.value }
                      )
                    }
                    className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                  >
                    <option value="hierarchical_superior">Supérieur hiérarchique direct</option>
                    <option value="role_label">Rôle (groupe du workspace)</option>
                  </select>
                  {steps[drawer.index].approver_config.criterion === "role_label" && (
                    <div className="w-64">
                      <SearchSelect<GroupRecord>
                        fetchOptions={fetchGroups}
                        value={(steps[drawer.index].approver_config.group_id as number) ?? null}
                        onChange={(value) =>
                          updateStepConfig(drawer.index, { criterion: "role_label", group_id: value as number })
                        }
                        getOptionLabel={groupLabel}
                        initialLabel={
                          steps[drawer.index].approver_config.group_id
                            ? groupDisplayName(steps[drawer.index].approver_config.group_id as number)
                            : undefined
                        }
                        placeholder="Rechercher un groupe…"
                      />
                    </div>
                  )}
                </>
              )}

              {needsApprovalModeChoice(steps[drawer.index].approver_type) && (
                <select
                  required
                  value={steps[drawer.index].approval_mode}
                  onChange={(e) =>
                    updateStep(drawer.index, { approval_mode: e.target.value as StepDraft["approval_mode"] })
                  }
                  className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                >
                  <option value="" disabled>
                    Mode d&apos;approbation…
                  </option>
                  <option value="any">N&apos;importe quel approbateur (any)</option>
                  <option value="all">Tous les approbateurs (all)</option>
                </select>
              )}
            </div>

            <div className="pt-2 border-t border-outline-variant">
              <h4 className="text-sm font-semibold text-on-surface mb-1">En cas de rejet</h4>
              <Checkbox
                checked={steps[drawer.index].on_reject_restart_form}
                onChange={(checked) => updateStep(drawer.index, { on_reject_restart_form: checked })}
                label="Renvoyer tout le formulaire au soumetteur (redémarrage complet)"
                description="Décoché : le soumetteur met juste à jour les infos, et c'est cette même étape qui redécide après resoumission."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDrawer(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary"
              >
                Fermer
              </button>
            </div>
          </div>
        </RightDrawer>
      )}

      {drawer?.kind === "step-view" && (
        <RightDrawer title="Détail de l'étape" onClose={() => setDrawer(null)}>
          <div className="space-y-3 text-sm overflow-y-auto h-full pb-4">
            <p className="font-medium text-on-surface">{drawer.step.name}</p>
            <p className="text-on-surface-variant">{approverSummary(drawer.step)}</p>
            <div className="pt-2 border-t border-outline-variant">
              <p className="text-xs font-medium text-on-surface-variant mb-1">En cas de rejet</p>
              <p className="text-xs text-on-surface-variant">
                {drawer.step.on_reject_restart_form
                  ? "Renvoie tout le formulaire au soumetteur (redémarrage complet)."
                  : "Demande juste une mise à jour — la même étape redécide après resoumission."}
              </p>
            </div>
          </div>
        </RightDrawer>
      )}
    </div>
  );
}
