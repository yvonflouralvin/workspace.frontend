"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getMyAuthMethods,
  updateMyAuthMethod,
  unlinkMyAuthMethod,
  ApiError,
} from "@/app/lib/api";
import type { AuthMethod, AuthMethodProvider, AuthProvider } from "@/app/lib/types";

const PROVIDER_LABELS: Record<AuthMethodProvider, string> = {
  password: "Mot de passe",
  google: "Google",
  microsoft: "Microsoft",
  email_otp: "Code par email",
};

const ENFORCED_PROVIDER_LABELS: Record<AuthProvider, string> = {
  microsoft_entra: "Microsoft Entra",
  google_workspace: "Google Workspace",
  email_otp: "Code par email",
};

const ALL_PROVIDERS: AuthMethodProvider[] = ["password", "google", "microsoft", "email_otp"];
const OAUTH_PROVIDERS: AuthMethodProvider[] = ["google", "microsoft"];

function PreferencesContent() {
  const searchParams = useSearchParams();

  const [methods, setMethods] = useState<AuthMethod[]>([]);
  const [enforcedProvider, setEnforcedProvider] = useState<AuthProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(searchParams.get("oauth_error"));
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  useEffect(() => {
    getMyAuthMethods()
      .then((res) => {
        setMethods(res.methods);
        setEnforcedProvider(res.enforced_provider);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      })
      .finally(() => setLoading(false));
  }, []);

  function getMethod(provider: AuthMethodProvider): AuthMethod {
    return (
      methods.find((m) => m.provider === provider) ?? {
        provider,
        enabled: false,
        linked: false,
        provider_email: null,
      }
    );
  }

  async function handleToggle(provider: AuthMethodProvider, enabled: boolean) {
    setActionError(null);
    setSavingProvider(provider);
    try {
      await updateMyAuthMethod(provider, enabled);
      setMethods((prev) => {
        const exists = prev.some((m) => m.provider === provider);
        if (!exists) {
          return [...prev, { provider, enabled, linked: false, provider_email: null }];
        }
        return prev.map((m) => (m.provider === provider ? { ...m, enabled } : m));
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSavingProvider(null);
    }
  }

  async function handleUnlink(provider: AuthMethodProvider) {
    setActionError(null);
    setSavingProvider(provider);
    try {
      await unlinkMyAuthMethod(provider);
      setMethods((prev) => prev.filter((m) => m.provider !== provider));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSavingProvider(null);
    }
  }

  const locked = Boolean(enforcedProvider);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Préférences</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Choisissez comment vous souhaitez vous connecter à votre compte.
        </p>
      </div>

      {error && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      {locked && (
        <div className="rounded-xl border border-outline-variant bg-surface-container px-4 py-3">
          <p className="text-sm font-medium text-on-surface">
            Géré par votre organisation : {ENFORCED_PROVIDER_LABELS[enforcedProvider!]}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Votre mode de connexion est imposé par les paramètres de votre workspace. Vous ne
            pouvez pas le modifier ici.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant">
          {ALL_PROVIDERS.map((provider) => {
            const method = getMethod(provider);
            const isOAuth = OAUTH_PROVIDERS.includes(provider);
            const saving = savingProvider === provider;

            return (
              <div key={provider} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-on-surface">{PROVIDER_LABELS[provider]}</p>
                  {isOAuth && method.linked && method.provider_email && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{method.provider_email}</p>
                  )}
                  {isOAuth && !method.linked && (
                    <p className="text-xs text-on-surface-variant mt-0.5">Non lié</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {isOAuth && !method.linked && !locked && (
                    <a
                      href={`/api/oauth/${provider}/start?intent=link`}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm text-on-surface hover:bg-surface-container transition-colors"
                    >
                      Lier
                    </a>
                  )}

                  {isOAuth && method.linked && !locked && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(provider)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50"
                    >
                      Délier
                    </button>
                  )}

                  {(!isOAuth || method.linked) && (
                    <button
                      type="button"
                      onClick={() => handleToggle(provider, !method.enabled)}
                      disabled={saving || locked}
                      role="switch"
                      aria-checked={method.enabled}
                      className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${
                        method.enabled ? "bg-primary" : "bg-outline-variant"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          method.enabled ? "translate-x-4" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actionError && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
          {actionError}
        </p>
      )}
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense>
      <PreferencesContent />
    </Suspense>
  );
}
