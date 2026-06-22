"use client";

import { use, useCallback, useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { getFlow, listBindings, setBinding, ApiError } from "@/app/lib/api";
import type { Binding, FlowDetail, StepDef } from "@repo/approval-flows/types/flow";

type ConfigDraft = { approver_type: string; approver_config: Record<string, unknown> };

function draftFromStep(step: StepDef, binding?: Binding): ConfigDraft {
  if (binding) return { approver_type: binding.approver_type, approver_config: binding.approver_config };
  return { approver_type: step.approver_type, approver_config: step.approver_config };
}

export default function FlowBindingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = usePermissions();
  const canManage = can("approval_flows.manage");

  const [flow, setFlow] = useState<FlowDetail | null>(null);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ConfigDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [savedStep, setSavedStep] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    Promise.all([getFlow(id), listBindings(id)])
      .then(([flowDetail, bindingList]) => {
        setFlow(flowDetail);
        setBindings(bindingList);
        const nextDrafts: Record<string, ConfigDraft> = {};
        for (const step of flowDetail.steps) {
          const binding = bindingList.find((b) => b.step_key === step.step_key);
          nextDrafts[step.step_key] = draftFromStep(step, binding);
        }
        setDrafts(nextDrafts);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!canManage) return;
    refetch();
  }, [canManage, refetch]);

  function updateDraft(stepKey: string, patch: Partial<ConfigDraft>) {
    setDrafts((prev) => ({ ...prev, [stepKey]: { ...prev[stepKey], ...patch } }));
  }

  async function handleSave(stepKey: string) {
    setSavingStep(stepKey);
    setSavedStep(null);
    setError(null);
    try {
      const draft = drafts[stepKey];
      await setBinding(id, stepKey, draft);
      setSavedStep(stepKey);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSavingStep(null);
    }
  }

  if (!canManage) {
    return (
      <DashboardShell>
        <div className="p-8 max-w-3xl mx-auto">
          <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
            Accès restreint à cette section.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Configuration — {flow?.title ?? id}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Surcharger l&apos;approbateur de chaque étape pour ce workspace. Sans
            surcharge, la configuration par défaut du template s&apos;applique.
          </p>
        </div>

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading && <p className="text-sm text-on-surface-variant">Chargement…</p>}

        {!loading && flow && (
          <div className="space-y-4">
            {flow.steps.map((step) => {
              const draft = drafts[step.step_key];
              if (!draft) return null;
              const hasOverride = bindings.some((b) => b.step_key === step.step_key);

              return (
                <div key={step.step_key} className="rounded-xl border border-outline-variant p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-on-surface">{step.name}</h3>
                      <p className="text-xs text-on-surface-variant">
                        Clé : {step.step_key} · Mode : {step.approval_mode === "any" ? "any" : "all"}
                        {hasOverride && " · surcharge active"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={draft.approver_type}
                      onChange={(e) => {
                        const approver_type = e.target.value;
                        updateDraft(step.step_key, {
                          approver_type,
                          approver_config: approver_type === "criteria" ? { criterion: "hierarchical_superior" } : {},
                        });
                      }}
                      className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                    >
                      <option value="specific_user">Utilisateur précis</option>
                      <option value="specific_group">Groupe précis</option>
                      <option value="criteria">Critère</option>
                    </select>

                    {draft.approver_type === "specific_user" && (
                      <input
                        type="number"
                        placeholder="ID utilisateur"
                        value={(draft.approver_config.user_id as number) ?? ""}
                        onChange={(e) =>
                          updateDraft(step.step_key, { approver_config: { user_id: Number(e.target.value) } })
                        }
                        className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm w-40"
                      />
                    )}

                    {draft.approver_type === "specific_group" && (
                      <input
                        type="number"
                        placeholder="ID groupe"
                        value={(draft.approver_config.group_id as number) ?? ""}
                        onChange={(e) =>
                          updateDraft(step.step_key, { approver_config: { group_id: Number(e.target.value) } })
                        }
                        className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm w-40"
                      />
                    )}

                    {draft.approver_type === "criteria" && (
                      <>
                        <select
                          value={(draft.approver_config.criterion as string) ?? "hierarchical_superior"}
                          onChange={(e) =>
                            updateDraft(step.step_key, {
                              approver_config:
                                e.target.value === "role_label"
                                  ? { criterion: "role_label", label: draft.approver_config.label ?? "" }
                                  : { criterion: e.target.value },
                            })
                          }
                          className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
                        >
                          <option value="hierarchical_superior">Supérieur hiérarchique direct</option>
                          <option value="role_label">Étiquette de rôle</option>
                        </select>
                        {draft.approver_config.criterion === "role_label" && (
                          <input
                            type="text"
                            placeholder="Étiquette (ex: Responsable RH)"
                            value={(draft.approver_config.label as string) ?? ""}
                            onChange={(e) =>
                              updateDraft(step.step_key, {
                                approver_config: { criterion: "role_label", label: e.target.value },
                              })
                            }
                            className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm w-56"
                          />
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSave(step.step_key)}
                      disabled={savingStep === step.step_key}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
                    >
                      {savingStep === step.step_key ? "Enregistrement…" : "Enregistrer"}
                    </button>

                    {savedStep === step.step_key && (
                      <span className="text-xs text-secondary">Enregistré.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
