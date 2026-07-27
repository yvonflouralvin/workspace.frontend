"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AttachFileOutlined,
  CheckOutlined,
  CloseOutlined,
  LinkOutlined,
  UploadFileOutlined,
} from "@mui/icons-material";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { Toast } from "@repo/ui/Toast";
import {
  DELIVERABLE_TYPE_LABELS,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_TONES,
  projectsApi,
  type DeliverableVersion,
} from "@/app/lib/projects-api";
import { useDeliverable } from "./deliverable-context";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DeliverableOverviewPage() {
  const { deliverable, approvers, reload, canManage } = useDeliverable();

  const [versions, setVersions] = useState<DeliverableVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [contentRich, setContentRich] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => projectsApi.listVersions(deliverable.id).then(setVersions).catch(() => setVersions([])),
    [deliverable.id]
  );
  useEffect(() => {
    void load();
  }, [load]);

  const pending = versions?.find((v) => v.status === "EN_ATTENTE") ?? null;
  const canApprove = approvers?.can_approve ?? false;
  // Le backend refuse une version vide : autant l'empêcher avant l'erreur.
  const readyToSubmit =
    deliverable.expected_type === "LIEN"
      ? contentUrl.trim().startsWith("http")
      : deliverable.expected_type === "DOCUMENT"
        ? Boolean(contentRich)
        : Boolean(file);

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      await reload();
      setToast(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[820px] space-y-5">
      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      {pending ? (
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <p className="text-body-md font-semibold text-on-surface">
            Version {pending.number} en attente de décision
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Soumise par {pending.submitted_by_name ?? "—"} le {fmt(pending.submitted_at)}.
          </p>
          {canApprove ? (
            <>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={2}
                placeholder="Motif — obligatoire en cas de rejet"
                className={`${FIELD} mt-3 resize-none`}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        projectsApi.decideVersion(deliverable.id, pending.id, true, decisionNote || null),
                      "Version approuvée."
                    ).then(() => setDecisionNote(""))
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
                >
                  <CheckOutlined style={{ fontSize: 16 }} />
                  Approuver
                </button>
                <button
                  type="button"
                  disabled={busy || !decisionNote.trim()}
                  title={!decisionNote.trim() ? "Un rejet doit être motivé" : undefined}
                  onClick={() =>
                    run(
                      () =>
                        projectsApi.decideVersion(deliverable.id, pending.id, false, decisionNote),
                      "Version rejetée."
                    ).then(() => setDecisionNote(""))
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-outline-soft text-body-sm font-semibold text-error hover:bg-error-container disabled:opacity-50 transition-colors"
                >
                  <CloseOutlined style={{ fontSize: 16 }} />
                  Rejeter
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-label-md text-outline">
              Vous n&apos;approuvez pas ce livrable — la décision revient à ses approbateurs.
            </p>
          )}
        </div>
      ) : (
        canManage && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className="text-label-sm uppercase text-outline mb-2">
              Soumettre une version — {DELIVERABLE_TYPE_LABELS[deliverable.expected_type].toLowerCase()} attendu
            </p>

            {deliverable.expected_type === "LIEN" && (
              <input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://…"
                className={FIELD}
              />
            )}

            {deliverable.expected_type === "DOCUMENT" && (
              <div className="rounded-lg border border-outline-soft overflow-hidden">
                <RichTextEditor
                  value={null}
                  editable
                  placeholder="Rédigez le contenu de cette version…"
                  className="min-h-[12rem]"
                  onChange={(json) => setContentRich(json)}
                />
              </div>
            )}

            {deliverable.expected_type === "FICHIER" && (
              <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft cursor-pointer hover:bg-surface-container-low transition-colors">
                  <AttachFileOutlined style={{ fontSize: 16 }} />
                  Choisir un fichier
                </span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <span className="truncate">{file ? file.name : "Aucun fichier choisi"}</span>
              </label>
            )}

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ce qui a changé par rapport à la version précédente…"
              className={`${FIELD} mt-2 resize-none`}
            />
            <button
              type="button"
              disabled={busy || !readyToSubmit}
              onClick={() =>
                run(async () => {
                  if (deliverable.expected_type === "FICHIER") {
                    await projectsApi.submitVersionFile(deliverable.id, file!, note.trim() || null);
                  } else {
                    await projectsApi.submitVersion(deliverable.id, {
                      note: note.trim() || null,
                      content_url: contentUrl.trim() || null,
                      content_rich: contentRich,
                    });
                  }
                  setNote("");
                  setContentUrl("");
                  setContentRich(null);
                  setFile(null);
                }, "Version soumise.")
              }
              className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
            >
              <UploadFileOutlined style={{ fontSize: 16 }} />
              Soumettre pour approbation
            </button>
          </div>
        )
      )}

      <div>
        <p className="text-label-sm uppercase text-outline mb-2">Historique des versions</p>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          {versions === null && (
            <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>
          )}
          {versions?.length === 0 && (
            <p className="px-4 py-3 text-body-sm text-on-surface-variant">
              Aucune version soumise pour l&apos;instant.
            </p>
          )}
          {versions?.map((version) => {
            const tone = VERSION_STATUS_TONES[version.status] ?? VERSION_STATUS_TONES.EN_ATTENTE!;
            return (
              <div key={version.id} className="px-4 py-3 border-b border-hairline last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-body-sm font-semibold text-on-surface">
                    v{version.number}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}
                  >
                    <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
                    {VERSION_STATUS_LABELS[version.status] ?? version.status}
                  </span>
                  <span className="ml-auto text-label-md text-outline">{fmt(version.submitted_at)}</span>
                </div>
                <p className="mt-1 text-label-md text-outline">
                  Soumise par {version.submitted_by_name ?? "—"}
                </p>
                {version.content_url && (
                  <a
                    href={version.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline break-all"
                  >
                    <LinkOutlined style={{ fontSize: 15 }} />
                    {version.content_url}
                  </a>
                )}
                {version.document_id && (
                  <a
                    href={projectsApi.versionFileUrl(deliverable.id, version.id)}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
                  >
                    <AttachFileOutlined style={{ fontSize: 15 }} />
                    {version.file_name}
                    {version.file_size != null && (
                      <span className="text-outline font-normal">
                        ({Math.max(1, Math.round(version.file_size / 1024))} Ko)
                      </span>
                    )}
                  </a>
                )}
                {version.content_rich && (
                  <div className="mt-1.5 rounded-lg border border-outline-soft overflow-hidden">
                    <RichTextEditor value={version.content_rich} editable={false} />
                  </div>
                )}
                {version.note && (
                  <p className="mt-1.5 text-body-sm text-on-surface-variant whitespace-pre-wrap">
                    {version.note}
                  </p>
                )}
                {version.decided_at && (
                  <p className="mt-1.5 text-body-sm text-on-surface-variant">
                    <span className="text-outline">
                      {version.status === "APPROUVE" ? "Approuvée" : "Rejetée"} par{" "}
                      {version.decided_by_name ?? "—"} le {fmt(version.decided_at)}
                      {version.decision_note ? " — " : ""}
                    </span>
                    {version.decision_note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
