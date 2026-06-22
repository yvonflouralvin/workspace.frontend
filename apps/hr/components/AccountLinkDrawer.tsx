"use client";

import { useState, FormEvent } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { PasswordInput } from "@repo/ui/PasswordInput";
import {
  checkEmployeeAccountLink,
  linkEmployeeAccount,
  ApiError,
  type Employee,
} from "@/app/lib/api";

export function AccountLinkDrawer({
  employee,
  onClose,
  onLinked,
}: {
  employee: Employee;
  onClose: () => void;
  onLinked: (employee: Employee) => void;
}) {
  const [step, setStep] = useState<"email" | "details">("email");
  const [email, setEmail] = useState(employee.email);
  const [emailExists, setEmailExists] = useState(false);
  const [existingFullName, setExistingFullName] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const result = await checkEmployeeAccountLink(employee.id, email);
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
      const updated = await linkEmployeeAccount(employee.id, {
        email,
        password: emailExists ? undefined : password,
        full_name: emailExists ? undefined : fullName || undefined,
      });
      onLinked(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Lier à un compte" onClose={onClose}>
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
            <p className="text-xs text-on-surface-variant">
              Le compte de connexion peut différer de l'email professionnel de l'employé.
            </p>
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
              <p className="text-sm font-medium text-on-surface">{existingFullName ?? email}</p>
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
              {submitting ? "Liaison…" : "Lier"}
            </button>
          </div>
        </form>
      )}
    </RightDrawer>
  );
}
