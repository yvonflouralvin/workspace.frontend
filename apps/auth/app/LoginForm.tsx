"use client"

import {
  ArrowForward,
  Visibility,
  VisibilityOff,
  Lock,
  AlternateEmail,
  ArrowBack,
} from "@mui/icons-material"

import Image from 'next/image'
import { useState, FormEvent } from "react"
import Link from "next/link"

import { checkEmail, getLoginMethods, login, requestOtp, verifyOtp, ApiError } from "./lib/api"

const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN!;

const PROVIDER_LABELS: Record<string, string> = {
  microsoft: "Microsoft",
  google: "Google",
};

function startOAuth(provider: string) {
  window.location.href = `/api/oauth/${provider}/start?intent=login`;
}

export function LoginForm() {
  const [step, setStep] = useState<"email" | "choose" | "password" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [methods, setMethods] = useState<string[]>([]);
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { exists } = await checkEmail(email);

      if (!exists) {
        setError("Aucun compte n'est associé à cet email.");
        return;
      }

      const { methods: availableMethods } = await getLoginMethods(email);
      setMethods(availableMethods);

      if (availableMethods.length === 0) {
        setError("Aucune méthode de connexion n'est activée pour ce compte.");
        return;
      }

      if (availableMethods.length === 1) {
        await routeToMethod(availableMethods[0]);
        return;
      }

      setStep("choose");
    } catch {
      setError("Impossible de vérifier cet email. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function routeToMethod(provider: string) {
    if (provider === "google" || provider === "microsoft") {
      startOAuth(provider);
      return;
    }
    if (provider === "email_otp") {
      await sendLoginOtp();
      return;
    }
    setStep("password");
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      window.location.href = WORKSPACE_DOMAIN;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Mot de passe incorrect.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError(err.message);
      } else {
        setError("Impossible de vous connecter. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendLoginOtp() {
    setError(null);
    setLoading(true);

    try {
      const { dev_code } = await requestOtp(email, "login");
      setDevCode(dev_code ?? null);
      setStep("otp");
    } catch {
      setError("Impossible d'envoyer le code. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verifyOtp({ email, code: otpCode, purpose: "login" });
      window.location.href = WORKSPACE_DOMAIN;
    } catch {
      setError("Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep("email");
    setPassword("");
    setOtpCode("");
    setDevCode(null);
    setError(null);
  }

  return (<div className="bg-primary">
    <main className="flex min-h-screen w-full">
      {/* <!-- Left Side: Brand Marketing --> */}
      <section className="hidden lg:flex w-1/2 mesh-gradient relative overflow-hidden flex-col justify-between p-xl">
        <div className="grain-overlay absolute inset-0 pointer-events-none"></div>
        {/* <!-- Logo Area --> */}
        <div className="relative z-10">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 bg-transparent rounded-lg flex items-center justify-center shadow-lg">
              <Image src="/SaaSLogo.png" alt="Logo" width={100} height={100} />
            </div>
            <span className="font-display text-headline-sm text-white font-bold tracking-tight">Workspace</span>
          </div>
        </div>
        {/* <!-- Marketing Content --> */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-md">
            <span className="flex h-2 w-2 rounded-full bg-secondary-fixed"></span>
            <span className="font-label-sm text-label-sm text-white uppercase tracking-wider">Enterprise Ready</span>
          </div>
          <h1 className="font-display text-display text-white mb-md leading-tight">
            Built for Scale.<br />Designed for Speed.
          </h1>
          <p className="font-body-lg text-body-lg text-white/80 leading-relaxed mb-xl">
            Experience the next generation of collaborative productivity. Imani Workspace integrates high-performance tools with a minimalist interface to keep your team in the flow.
          </p>
          {/* <!-- Feature Grid (Subtle) --> */}
          <div className="grid grid-cols-2 gap-lg border-t border-white/10 pt-xl">
            <div>
              <span className="block font-display text-headline-sm text-white font-bold">99.9%</span>
              <span className="font-label-md text-label-md text-white/60">Uptime Reliability</span>
            </div>
            <div>
              <span className="block font-display text-headline-sm text-white font-bold">256-bit</span>
              <span className="font-label-md text-label-md text-white/60">AES Encryption</span>
            </div>
          </div>
        </div>
        {/* <!-- Visual Decorative Element (Mock UI Component) --> */}
        <div className="absolute -bottom-20 -right-20 w-[500px] h-[400px] bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-2xl rotate-12 flex flex-col p-md shadow-2xl">
          <div className="flex gap-2 mb-md">
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
            <div className="w-3 h-3 rounded-full bg-white/20"></div>
          </div>
          <div className="space-y-sm">
            <div className="h-4 w-3/4 bg-white/10 rounded"></div>
            <div className="h-4 w-1/2 bg-white/10 rounded"></div>
            <div className="grid grid-cols-3 gap-sm pt-md">
              <div className="h-20 bg-white/5 rounded-lg border border-white/10"></div>
              <div className="h-20 bg-white/5 rounded-lg border border-white/10"></div>
              <div className="h-20 bg-white/5 rounded-lg border border-white/10"></div>
            </div>
          </div>
        </div>
        {/* <!-- Footer Attribution --> */}
        <div className="relative z-10">
          <p className="font-label-sm text-label-sm text-white/50">
            © 2026 SAAS Workspace Inc. All rights reserved.
          </p>
        </div>
      </section>
      {/* <!-- Right Side: Login Form --> */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-md relative">
        {/* <!-- Mobile Logo Only --> */}
        <div className="absolute top-md left-md lg:hidden flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-[32px]">hub</span>
          <span className="font-display text-headline-sm text-on-surface font-bold">Imani</span>
        </div>
        <div className="w-full max-w-[420px] space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* <!-- Header --> */}
          <div className="space-y-sm">
            <h2 className="font-display text-headline-lg text-on-surface tracking-tight">Welcome back</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {step === "email" && "Enter your work email to access your workspace."}
              {step === "choose" && "Comment voulez-vous vous connecter ?"}
              {step === "password" && "Enter your password to continue."}
              {step === "otp" && "Entrez le code reçu par email."}
            </p>
          </div>

          {/* <!-- Error Message --> */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
              {error}
              {step === "email" && error.includes("Aucun compte") && (
                <>
                  {" "}
                  <Link className="font-semibold underline" href={`/register?email=${encodeURIComponent(email)}`}>
                    Créer un compte
                  </Link>
                </>
              )}
            </div>
          )}

          {/* <!-- Email Step --> */}
          {step === "email" && (
            <form className="space-y-lg" onSubmit={handleEmailSubmit}>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="email">Work Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AlternateEmail />
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    id="email"
                    name="email"
                    placeholder="name@company.com"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <button
                className="w-full py-3.5 bg-primary text-white font-display text-body-lg font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/30 transform active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2 disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Vérification..." : "Continuer"}
                <ArrowForward />
              </button>
            </form>
          )}

          {/* <!-- Choose Method Step --> */}
          {step === "choose" && (
            <div className="space-y-sm">
              <div className="flex items-center gap-1 px-1 mb-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 font-label-md text-label-md text-primary hover:underline transition-all"
                >
                  <ArrowBack fontSize="small" /> Changer d&apos;email
                </button>
              </div>

              {methods.includes("password") && (
                <button
                  type="button"
                  onClick={() => setStep("password")}
                  className="w-full py-3 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                >
                  Continuer avec mon mot de passe
                </button>
              )}

              {methods.includes("google") && (
                <button
                  type="button"
                  onClick={() => startOAuth("google")}
                  className="w-full py-3 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                >
                  Continuer avec {PROVIDER_LABELS.google}
                </button>
              )}

              {methods.includes("microsoft") && (
                <button
                  type="button"
                  onClick={() => startOAuth("microsoft")}
                  className="w-full py-3 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                >
                  Continuer avec {PROVIDER_LABELS.microsoft}
                </button>
              )}

              {methods.includes("email_otp") && (
                <button
                  type="button"
                  onClick={sendLoginOtp}
                  disabled={loading}
                  className="w-full py-3 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container-low transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  Recevoir un code par email
                </button>
              )}
            </div>
          )}

          {/* <!-- Password Step --> */}
          {step === "password" && (
            <form className="space-y-lg" onSubmit={handlePasswordSubmit}>
              <div className="space-y-xs">
                <div className="flex justify-between items-center px-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email-display">Email</label>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 font-label-md text-label-md text-primary hover:underline transition-all"
                  >
                    <ArrowBack fontSize="small" /> Changer
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AlternateEmail />
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-surface-container border border-outline-variant rounded-lg font-body-md text-on-surface-variant"
                    id="email-display"
                    type="email"
                    value={email}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="password">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock />
                  </div>
                  <input
                    className="w-full pl-10 pr-12 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface-variant transition-colors"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </button>
                </div>
              </div>

              <button
                className="w-full py-3.5 bg-primary text-white font-display text-body-lg font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/30 transform active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2 disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Sign In"}
                <ArrowForward />
              </button>

              {methods.includes("email_otp") && (
                <button
                  type="button"
                  onClick={sendLoginOtp}
                  disabled={loading}
                  className="w-full text-center font-body-sm text-body-sm text-primary hover:underline"
                >
                  Recevoir un code par email à la place
                </button>
              )}
            </form>
          )}

          {/* <!-- OTP Step --> */}
          {step === "otp" && (
            <form className="space-y-lg" onSubmit={handleOtpSubmit}>
              <div className="space-y-xs">
                <div className="flex justify-between items-center px-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="otp-email-display">Email</label>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 font-label-md text-label-md text-primary hover:underline transition-all"
                  >
                    <ArrowBack fontSize="small" /> Changer
                  </button>
                </div>
                <input
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-lg font-body-md text-on-surface-variant"
                  id="otp-email-display"
                  type="email"
                  value={email}
                  disabled
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="otp-code">Code reçu par email</label>
                <input
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant tracking-widest text-center"
                  id="otp-code"
                  name="otp-code"
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                />
                {devCode && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant ml-1">
                    Mode dev — code : <span className="font-semibold">{devCode}</span>
                  </p>
                )}
              </div>

              <button
                className="w-full py-3.5 bg-primary text-white font-display text-body-lg font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/30 transform active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2 disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? "Vérification..." : "Se connecter"}
                <ArrowForward />
              </button>

              <button
                type="button"
                onClick={sendLoginOtp}
                disabled={loading}
                className="w-full text-center font-body-sm text-body-sm text-primary hover:underline"
              >
                Renvoyer le code
              </button>
            </form>
          )}

          {/* <!-- Footer Link --> */}
          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link className="text-primary font-semibold hover:underline" href="/register">Create account</Link>
          </p>
        </div>
        {/* <!-- Bottom Legal for Right Side (Mobile) --> */}
        <div className="absolute bottom-md text-center w-full lg:hidden">
          <p className="font-label-sm text-label-sm text-outline">
            © 2024 Imani Workspace Inc.
          </p>
        </div>
      </section>
    </main>
  </div>
  );
}
