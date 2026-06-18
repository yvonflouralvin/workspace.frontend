"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@repo/ui/Modal";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { PasswordInput } from "@repo/ui/PasswordInput";
import { checkMemberEmail, createMember, ApiError } from "@/app/lib/api";
import type { Group, Member } from "@/app/lib/types";

export function AddMemberModal({
  workspaceId,
  groups,
  onClose,
  onCreated,
}: {
  workspaceId: number;
  groups: Group[];
  onClose: () => void;
  onCreated: (member: Member) => void;
}) {
  const [step, setStep] = useState<"email" | "details">("email");
  const [email, setEmail] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [existingFullName, setExistingFullName] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const result = await checkMemberEmail(workspaceId, email);
      if (result.already_member) {
        setError("Cette personne est déjà membre de ce workspace.");
        return;
      }
      setEmailExists(result.exists);
      setExistingFullName(result.full_name ?? null);
      setStep("details");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setChecking(false);
    }
  }

  function handleBack() {
    setStep("email");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const member = await createMember(workspaceId, {
        email,
        password: emailExists ? undefined : password,
        full_name: emailExists ? undefined : fullName || undefined,
        group_ids: groupIds,
      });
      onCreated(member);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Ajouter un membre" onClose={onClose}>
      {step === "email" ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={checking}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
            >
              {checking ? "Vérification…" : "Continuer"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {emailExists ? (
            <div className="rounded-xl border border-outline-variant px-3 py-2.5 bg-surface-container">
              <p className="text-sm font-medium text-on-surface">
                {existingFullName ?? email}
              </p>
              <p className="text-xs text-on-surface-variant">{email}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-on-surface">Nom complet</label>
                <input
                  type="text"
                  autoFocus
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-on-surface">Mot de passe</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="Mot de passe du nouveau compte"
                  generatable
                />
              </div>
            </>
          )}

          {groups.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-on-surface">Groupes</p>
              <MultiSelect
                options={groups.map((group) => ({ id: group.id, label: group.name }))}
                selectedIds={groupIds}
                onChange={(ids) => setGroupIds(ids as number[])}
                placeholder="Rechercher un groupe…"
              />
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={submitting || (!emailExists && !password)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
            >
              {submitting ? "Création…" : "Ajouter"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
