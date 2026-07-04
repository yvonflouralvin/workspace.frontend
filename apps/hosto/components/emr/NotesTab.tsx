"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Modal } from "@repo/ui/Modal";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  AddOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PostAddOutlined,
  HistoryEduOutlined,
  ExpandMoreOutlined,
} from "@mui/icons-material";
import {
  getPatientNotes,
  createNote,
  updateNote,
  signNote,
  amendNote,
  deleteNote,
  getPatientEncounters,
  createEncounter,
  getEncounterById,
  type ClinicalNoteRead,
  type ClinicalNoteUpdate,
  type EncounterRead,
} from "@/app/lib/emr-api";
import { NoteForm } from "./NoteForm";

// ─── Constants ───────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors resize-none";
const labelCls = "text-label-md font-medium text-on-surface-variant";

const SOAP_FIELDS: Array<{
  key: keyof ClinicalNoteUpdate;
  label: string;
  hint: string;
  rows: number;
}> = [
  {
    key: "subjective",
    label: "S — Subjectif",
    hint: "Ce que le patient rapporte : motif, plaintes, antécédents pertinents.",
    rows: 4,
  },
  {
    key: "objective",
    label: "O — Objectif",
    hint: "Examen clinique, constantes, résultats d'examens.",
    rows: 4,
  },
  {
    key: "assessment",
    label: "A — Évaluation",
    hint: "Diagnostic principal, hypothèses diagnostiques, évolution.",
    rows: 3,
  },
  {
    key: "plan",
    label: "P — Plan",
    hint: "Conduite à tenir : traitements, examens complémentaires, suivi.",
    rows: 3,
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type DrawerMode = "create" | "edit" | "amend";

interface SoapForm {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const EMPTY_FORM: SoapForm = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notePreview(note: ClinicalNoteRead): string {
  const text = note.assessment ?? note.subjective ?? note.objective ?? note.plan;
  if (!text) return "Aucun contenu.";
  return text.length > 140 ? text.slice(0, 137) + "…" : text;
}

function encounterLabel(enc: { id: number; type: string; status: string } | EncounterRead): string {
  const typeMap: Record<string, string> = {
    CONSULTATION: "Consultation",
    URGENCE: "Urgence",
    HOSPITALISATION: "Hospitalisation",
    SUIVI: "Suivi",
  };
  return `${typeMap[enc.type] ?? enc.type} #${enc.id}`;
}

// ─── Grouping ────────────────────────────────────────────────────────────────

interface NoteGroup {
  root: ClinicalNoteRead;
  addendums: ClinicalNoteRead[];
}

function groupNotes(notes: ClinicalNoteRead[]): NoteGroup[] {
  const roots = notes.filter((n) => n.amends_note_id === null);
  const byParent = new Map<number, ClinicalNoteRead[]>();
  for (const n of notes) {
    if (n.amends_note_id !== null) {
      const arr = byParent.get(n.amends_note_id) ?? [];
      arr.push(n);
      byParent.set(n.amends_note_id, arr);
    }
  }
  return roots.map((root) => ({
    root,
    addendums: (byParent.get(root.id) ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ signed }: { signed: boolean }) {
  return signed ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm bg-secondary/10 text-secondary font-medium">
      <LockOutlined style={{ fontSize: 11 }} />
      Signée
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm bg-surface-container text-on-surface-variant font-medium">
      Brouillon
    </span>
  );
}

function NoteSection({
  label,
  content,
}: {
  label: string;
  content: string | null;
}) {
  if (!content) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wide">
        {label}
      </p>
      <p className="text-body-sm text-on-surface whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function NoteCard({
  note,
  expanded,
  onToggle,
  canWrite,
  canSign,
  onEdit,
  onSign,
  onAmend,
  onDelete,
  isAddendum,
}: {
  note: ClinicalNoteRead;
  expanded: boolean;
  onToggle: () => void;
  canWrite: boolean;
  canSign: boolean;
  onEdit: () => void;
  onSign: () => void;
  onAmend: () => void;
  onDelete: () => void;
  isAddendum?: boolean;
}) {
  const isEmpty =
    !note.subjective && !note.objective && !note.assessment && !note.plan;

  return (
    <div
      className={`rounded-2xl border bg-surface-container-lowest overflow-hidden ${
        isAddendum
          ? "border-outline-variant/60 border-l-4 border-l-tertiary/40"
          : "border-outline-variant"
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-surface-container/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-2xl"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isAddendum && (
              <span className="text-label-xs text-tertiary font-medium">Addendum</span>
            )}
            <StatusBadge signed={note.signed} />
            <span className="text-body-sm text-on-surface-variant">
              {fmtDate(note.created_at)}
            </span>
            <span className="text-body-sm text-on-surface-variant/50">·</span>
            <span className="text-body-sm text-on-surface-variant">
              {encounterLabel(note.encounter)}
            </span>
          </div>
          {!expanded && (
            <p className="text-body-sm text-on-surface-variant line-clamp-2 mt-1">
              {notePreview(note)}
            </p>
          )}
        </div>
        <ExpandMoreOutlined
          style={{ fontSize: 20 }}
          className={`text-on-surface-variant shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-4 space-y-4 border-t border-outline-variant/40">
          {isEmpty ? (
            <p className="pt-3 text-body-sm text-on-surface-variant/60 italic">
              Aucun contenu rédigé.
            </p>
          ) : (
            <div className="pt-3 space-y-3">
              <NoteSection label="Subjectif" content={note.subjective} />
              <NoteSection label="Objectif" content={note.objective} />
              <NoteSection label="Évaluation" content={note.assessment} />
              <NoteSection label="Plan" content={note.plan} />
            </div>
          )}

          {note.signed && note.signed_at && (
            <div className="flex items-center gap-2 pt-1 text-label-sm text-secondary/70">
              <LockOutlined style={{ fontSize: 13 }} />
              Signée le {fmtDateTime(note.signed_at)}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {!note.signed && canWrite && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-medium bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <EditOutlined style={{ fontSize: 14 }} />
                Modifier
              </button>
            )}
            {!note.signed && canSign && (
              <button
                type="button"
                onClick={onSign}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity"
              >
                <HistoryEduOutlined style={{ fontSize: 14 }} />
                Signer
              </button>
            )}
            {note.signed && canWrite && (
              <button
                type="button"
                onClick={onAmend}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-medium bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <PostAddOutlined style={{ fontSize: 14 }} />
                Ajouter un addendum
              </button>
            )}
            {!note.signed && canWrite && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-medium text-error hover:bg-error-container/40 transition-colors"
              >
                <DeleteOutlined style={{ fontSize: 14 }} />
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotesTab({
  patientId,
  canWrite,
  canSign,
  onMutation,
  encounterId,
  onSplit,
  onCloseSplit,
}: {
  patientId: number;
  canWrite: boolean;
  canSign: boolean;
  onMutation?: () => void;
  encounterId?: number;
  onSplit?: (title: string, content: React.ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  // ── Data state ──
  const [notes, setNotes] = useState<ClinicalNoteRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Expanded cards ──
  const [expanded, dispatch] = useReducer(
    (state: Set<number>, action: { type: "toggle"; id: number } | { type: "add"; id: number }) => {
      const next = new Set(state);
      if (action.type === "toggle") {
        if (next.has(action.id)) next.delete(action.id);
        else next.add(action.id);
      } else {
        next.add(action.id);
      }
      return next;
    },
    new Set<number>(),
  );

  // ── Drawer ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editTarget, setEditTarget] = useState<ClinicalNoteRead | null>(null);
  const [form, setForm] = useState<SoapForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Active encounter (resolved on create) ──
  const [activeEncounter, setActiveEncounter] = useState<EncounterRead | null>(null);
  const [encounterLoading, setEncounterLoading] = useState(false);

  // ── Sign modal ──
  const [signTarget, setSignTarget] = useState<ClinicalNoteRead | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // ── Delete modal ──
  const [deleteTarget, setDeleteTarget] = useState<ClinicalNoteRead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const firstFieldRef = useRef<HTMLTextAreaElement>(null);

  // ── Load notes ──
  const loadNotes = useCallback(() => {
    setLoading(true);
    setError(null);
    getPatientNotes(patientId)
      .then(setNotes)
      .catch(() => setError("Impossible de charger les notes."))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Auto-expand newest note on first load
  useEffect(() => {
    if (!loading && notes.length > 0) {
      dispatch({ type: "add", id: notes[0].id });
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Encounter resolution ──
  async function resolveEncounter(): Promise<EncounterRead> {
    setEncounterLoading(true);
    try {
      const { items } = await getPatientEncounters(patientId, { per_page: 10 });
      const ongoing = items.find((e) => e.status === "EN_COURS");
      if (ongoing) return ongoing;
      return await createEncounter({
        patient_id: patientId,
        type: "CONSULTATION",
        status: "EN_COURS",
      });
    } finally {
      setEncounterLoading(false);
    }
  }

  // ── Open create drawer ──
  async function openCreate() {
    try {
      let enc: EncounterRead;
      if (encounterId !== undefined) {
        enc = await getEncounterById(encounterId);
      } else {
        enc = await resolveEncounter();
      }
      if (onSplit) {
        onSplit("Nouvelle note", (
          <NoteForm
            patientId={patientId}
            encounterId={enc.id}
            mode="create"
            onSaved={() => { loadNotes(); onMutation?.(); onCloseSplit?.(); }}
            onClose={() => onCloseSplit?.()}
          />
        ));
        return;
      }
      setActiveEncounter(enc);
      setDrawerMode("create");
      setEditTarget(null);
      setForm(EMPTY_FORM);
      setSaveError(null);
      setDrawerOpen(true);
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    } catch {
      setError("Impossible de déterminer la consultation en cours.");
    }
  }

  // ── Open edit drawer ──
  function openEdit(note: ClinicalNoteRead) {
    if (onSplit) {
      onSplit("Modifier la note", (
        <NoteForm
          patientId={patientId}
          encounterId={encounterId}
          mode="edit"
          initialData={note}
          onSaved={() => { loadNotes(); onMutation?.(); onCloseSplit?.(); }}
          onClose={() => onCloseSplit?.()}
        />
      ));
      return;
    }
    setActiveEncounter(null);
    setDrawerMode("edit");
    setEditTarget(note);
    setForm({
      subjective: note.subjective ?? "",
      objective: note.objective ?? "",
      assessment: note.assessment ?? "",
      plan: note.plan ?? "",
    });
    setSaveError(null);
    setDrawerOpen(true);
    setTimeout(() => firstFieldRef.current?.focus(), 50);
  }

  // ── Open amend drawer ──
  function openAmend(note: ClinicalNoteRead) {
    if (onSplit) {
      onSplit("Addendum", (
        <NoteForm
          patientId={patientId}
          encounterId={encounterId}
          mode="amend"
          initialData={note}
          onSaved={() => { loadNotes(); onMutation?.(); onCloseSplit?.(); }}
          onClose={() => onCloseSplit?.()}
        />
      ));
      return;
    }
    setActiveEncounter(null);
    setDrawerMode("amend");
    setEditTarget(note);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setDrawerOpen(true);
    setTimeout(() => firstFieldRef.current?.focus(), 50);
  }

  // ── Save (create / update / amend) ──
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (drawerMode === "create" && activeEncounter) {
        const payload = {
          patient_id: patientId,
          encounter_id: activeEncounter.id,
          subjective: form.subjective || null,
          objective: form.objective || null,
          assessment: form.assessment || null,
          plan: form.plan || null,
        };
        const created = await createNote(payload);
        setNotes((prev) => [created, ...prev]);
        dispatch({ type: "add", id: created.id });
      } else if (drawerMode === "edit" && editTarget) {
        const updated = await updateNote(editTarget.id, {
          subjective: form.subjective || null,
          objective: form.objective || null,
          assessment: form.assessment || null,
          plan: form.plan || null,
        });
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } else if (drawerMode === "amend" && editTarget) {
        const created = await amendNote(editTarget.id, {
          subjective: form.subjective || null,
          objective: form.objective || null,
          assessment: form.assessment || null,
          plan: form.plan || null,
        });
        setNotes((prev) => [created, ...prev]);
        dispatch({ type: "add", id: created.id });
      }
      setDrawerOpen(false);
      onMutation?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Sign ──
  async function handleSign() {
    if (!signTarget) return;
    setSigning(true);
    setSignError(null);
    try {
      const signed = await signNote(signTarget.id);
      setNotes((prev) => prev.map((n) => (n.id === signed.id ? signed : n)));
      setSignTarget(null);
      onMutation?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la signature.";
      setSignError(msg);
    } finally {
      setSigning(false);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteNote(deleteTarget.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setDeleteTarget(null);
      onMutation?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la suppression.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ──
  const groups = groupNotes(notes);

  const drawerTitle =
    drawerMode === "create"
      ? "Nouvelle note SOAP"
      : drawerMode === "edit"
        ? "Modifier la note"
        : `Addendum — ${editTarget ? fmtDate(editTarget.created_at) : ""}`;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <h2 className="text-title-sm font-medium text-on-surface">Notes cliniques</h2>
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              disabled={encounterLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              {encounterLoading ? "Chargement…" : "Nouvelle note"}
            </button>
          )}
        </div>

        {/* ── States ── */}
        {loading && (
          <div className="p-5 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="px-5 py-4">
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && notes.length === 0 && (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <HistoryEduOutlined
              style={{ fontSize: 36 }}
              className="text-on-surface-variant/30"
            />
            <p className="text-body-md text-on-surface-variant">
              Aucune note rédigée pour ce patient.
            </p>
            {canWrite && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Rédiger une note
              </button>
            )}
          </div>
        )}

        {/* ── Note groups ── */}
        {!loading && !error && groups.length > 0 && (
          <div className="p-4 space-y-3">
            {groups.map(({ root, addendums: adds }) => (
              <div key={root.id} className="space-y-2">
                <NoteCard
                  note={root}
                  expanded={expanded.has(root.id)}
                  onToggle={() => dispatch({ type: "toggle", id: root.id })}
                  canWrite={canWrite}
                  canSign={canSign}
                  onEdit={() => openEdit(root)}
                  onSign={() => {
                    setSignTarget(root);
                    setSignError(null);
                  }}
                  onAmend={() => openAmend(root)}
                  onDelete={() => {
                    setDeleteTarget(root);
                    setDeleteError(null);
                  }}
                />
                {/* Addendums */}
                {adds.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {adds.map((add) => (
                      <NoteCard
                        key={add.id}
                        note={add}
                        expanded={expanded.has(add.id)}
                        onToggle={() => dispatch({ type: "toggle", id: add.id })}
                        canWrite={canWrite}
                        canSign={canSign}
                        onEdit={() => openEdit(add)}
                        onSign={() => {
                          setSignTarget(add);
                          setSignError(null);
                        }}
                        onAmend={() => openAmend(add)}
                        onDelete={() => {
                          setDeleteTarget(add);
                          setDeleteError(null);
                        }}
                        isAddendum
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit / Amend drawer ── */}
      {drawerOpen && (
      <RightDrawer
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
      >
        <div className="flex flex-col h-full">
          {/* Encounter context chip */}
          {(drawerMode === "create" && activeEncounter) && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container text-body-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">
                {encounterLabel(activeEncounter)}
              </span>
              {activeEncounter.motif && (
                <span className="text-on-surface-variant/70">· {activeEncounter.motif}</span>
              )}
            </div>
          )}

          {drawerMode === "amend" && editTarget && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-tertiary/10 text-body-sm text-on-surface">
              Addendum à la note du{" "}
              <span className="font-medium">{fmtDate(editTarget.created_at)}</span>.
              La note originale reste intacte.
            </div>
          )}

          {/* SOAP fields */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {SOAP_FIELDS.map((field, idx) => (
              <div key={field.key} className="space-y-1.5">
                <label className={labelCls} htmlFor={`soap-${field.key}`}>
                  {field.label}
                </label>
                <p className="text-body-sm text-on-surface-variant/70">{field.hint}</p>
                <textarea
                  id={`soap-${field.key}`}
                  ref={idx === 0 ? firstFieldRef : undefined}
                  rows={field.rows}
                  value={form[field.key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className={inputCls}
                  placeholder={`Rédiger le ${field.label.split(" — ")[1]?.toLowerCase() ?? field.label}…`}
                />
              </div>
            ))}
          </div>

          {saveError && (
            <p className="mt-3 text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">
              {saveError}
            </p>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-label-md font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving
                ? "Enregistrement…"
                : drawerMode === "amend"
                  ? "Créer l'addendum"
                  : "Enregistrer le brouillon"}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="px-4 py-2.5 rounded-xl text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </RightDrawer>
      )}

      {/* ── Sign confirmation modal ── */}
      {signTarget && (
        <Modal
          onClose={() => !signing && setSignTarget(null)}
          title="Signer cette note ?"
        >
          <div className="space-y-4">
            <p className="text-body-md text-on-surface">
              Une fois signée, cette note ne pourra plus être modifiée ni supprimée.
              Toute correction passera par un addendum.
            </p>
            <div className="rounded-xl bg-surface-container px-4 py-3 text-body-sm text-on-surface-variant">
              Note du{" "}
              <span className="font-medium text-on-surface">
                {fmtDate(signTarget.created_at)}
              </span>{" "}
              — {notePreview(signTarget)}
            </div>
            {signError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">
                {signError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSign}
                disabled={signing}
                className="flex-1 py-2.5 rounded-xl text-label-md font-medium bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {signing ? "Signature…" : "Signer la note"}
              </button>
              <button
                type="button"
                onClick={() => setSignTarget(null)}
                disabled={signing}
                className="px-4 py-2.5 rounded-xl text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <Modal
          onClose={() => !deleting && setDeleteTarget(null)}
          title="Supprimer ce brouillon ?"
        >
          <div className="space-y-4">
            <p className="text-body-md text-on-surface">
              Cette action supprime définitivement le brouillon. Elle est irréversible.
            </p>
            {deleteError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-label-md font-medium bg-error text-on-error hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
