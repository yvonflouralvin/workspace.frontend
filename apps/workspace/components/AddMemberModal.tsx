"use client";

import { useState, FormEvent } from "react";
import { AutorenewOutlined } from "@mui/icons-material";
import { Modal } from "@repo/ui/Modal";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { checkMemberEmail, createMember, ApiError } from "@/app/lib/api";
import { generatePassword } from "@/app/lib/members";
import type { Group, Member } from "@/app/lib/types";

const FIELD =
  "w-full h-[38px] px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-md font-semibold text-on-surface mb-1.5";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [existingFullName, setExistingFullName] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function goToDetails() {
    setError(null);
    setBusy(true);
    try {
      const result = await checkMemberEmail(workspaceId, email);
      if (result.already_member) {
        setError("Cette personne est déjà membre de ce workspace.");
        return;
      }
      setEmailExists(result.exists);
      setExistingFullName(result.full_name ?? null);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    setBusy(true);
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
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) void goToDetails();
    else void submit();
  }

  const canSubmit = step === 1 ? email.trim().length > 0 : emailExists || password.length > 0;

  return (
    <Modal
      title="Ajouter un membre"
      onClose={onClose}
      width="max-w-[32rem]"
      headerAside={`Étape ${step}/2`}
      footer={
        <>
          <button
            type="button"
            onClick={() => (step === 1 ? onClose() : setStep(1))}
            disabled={busy}
            className="h-[38px] px-4 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            {step === 1 ? "Annuler" : "Retour"}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !canSubmit}
            className="ml-auto h-[38px] px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {busy ? "…" : step === 1 ? "Continuer" : "Ajouter"}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {step === 1 ? (
          <div>
            <label className={LABEL}>Adresse email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@exemple.com"
              className={FIELD}
            />
            <p className="text-label-md text-outline mt-2">
              Nous vérifions si un compte existe déjà avec cette adresse.
            </p>
          </div>
        ) : (
          <>
            {emailExists ? (
              <div className="rounded-lg border border-outline-soft bg-surface-container px-3 py-2.5">
                <p className="text-body-md font-medium text-on-surface">
                  {existingFullName ?? email}
                </p>
                <p className="text-label-md text-outline">{email}</p>
              </div>
            ) : (
              <>
                <div>
                  <label className={LABEL}>Nom complet</label>
                  <input
                    type="text"
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Camille Rousseau"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className={LABEL}>Mot de passe</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mot de passe du nouveau compte"
                      className={`${FIELD} font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setPassword(generatePassword())}
                      className="inline-flex items-center gap-1.5 h-[38px] px-3 flex-none rounded-lg border border-outline-soft bg-surface-container-lowest text-label-md font-semibold text-primary hover:bg-surface-container-low transition-colors"
                    >
                      <AutorenewOutlined style={{ fontSize: 15 }} />
                      Générer
                    </button>
                  </div>
                </div>
              </>
            )}

            {groups.length > 0 && (
              <div>
                <label className={LABEL}>Groupes</label>
                <MultiSelect
                  options={groups.map((group) => ({ id: group.id, label: group.name }))}
                  selectedIds={groupIds}
                  onChange={(ids) => setGroupIds(ids as number[])}
                  placeholder="Ajouter un groupe…"
                />
              </div>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
