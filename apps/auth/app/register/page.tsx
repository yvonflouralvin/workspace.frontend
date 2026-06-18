"use client"

import {
  ArrowForward,
  ArrowBack,
  Visibility,
  VisibilityOff,
  Lock,
  AlternateEmail,
  Person,
  Apartment,
  PersonOutlined,
  GroupsOutlined,
} from "@mui/icons-material"

import Image from 'next/image'
import Link from "next/link"
import { Suspense, useState, FormEvent } from "react"
import { useSearchParams } from "next/navigation"

import { checkEmail, register, login, ApiError } from "../lib/api"

const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN!;

type Step = "email" | "name" | "password" | "workspace";
type WorkspaceType = "individual" | "organization";

const STEPS: Step[] = ["email", "name", "password", "workspace"];

const STEP_LABELS: Record<Step, string> = {
  email: "Votre adresse email",
  name: "Votre nom complet",
  password: "Choisissez un mot de passe",
  workspace: "Configurez votre workspace",
};

const WORKSPACE_TYPE_OPTIONS: {
  value: WorkspaceType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "individual",
    label: "Individuel",
    description: "Un espace personnel, pour vous seul.",
    icon: <PersonOutlined />,
  },
  {
    value: "organization",
    label: "Organisation",
    description: "Un espace pour collaborer avec votre équipe.",
    icon: <GroupsOutlined />,
  },
];

function slugifyName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function RegisterForm() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("individual");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { exists } = await checkEmail(email);

      if (exists) {
        setError("Un compte existe déjà avec cet email.");
        return;
      }

      setStep("name");
    } catch {
      setError("Impossible de vérifier cet email. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Merci de renseigner votre nom complet.");
      return;
    }

    setStep("password");
  }

  function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setWorkspaceName(slugifyName(email.split("@")[0] ?? ""));
    setStep("workspace");
  }

  async function handleWorkspaceSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!workspaceName.trim()) {
      setError("Merci de donner un nom à votre workspace.");
      return;
    }

    setLoading(true);

    try {
      await register(email, password, fullName, workspaceName, workspaceType);
      await login(email, password);
      window.location.href = WORKSPACE_DOMAIN;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Un compte existe déjà avec cet email.");
        setStep("email");
      } else {
        setError("Impossible de créer le compte. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError(null);
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous);
  }

  return (<div className="bg-primary">
    <main className="flex min-h-screen w-full">
      {/* <!-- Left Side: Brand Marketing --> */}
      <section className="hidden lg:flex w-1/2 mesh-gradient relative overflow-hidden flex-col justify-between p-xl">
        <div className="grain-overlay absolute inset-0 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 bg-transparent rounded-lg flex items-center justify-center shadow-lg">
              <Image src="/SaaSLogo.png" alt="Logo" width={100} height={100} />
            </div>
            <span className="font-display text-headline-sm text-white font-bold tracking-tight">Workspace</span>
          </div>
        </div>
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
        <div className="relative z-10">
          <p className="font-label-sm text-label-sm text-white/50">
            © 2026 SAAS Workspace Inc. All rights reserved.
          </p>
        </div>
      </section>
      {/* <!-- Right Side: Register Form --> */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-md relative">
        <div className="absolute top-md left-md lg:hidden flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-[32px]">hub</span>
          <span className="font-display text-headline-sm text-on-surface font-bold">Imani</span>
        </div>
        <div className="w-full max-w-[420px] space-y-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* <!-- Step Indicator --> */}
          <div className="space-y-sm">
            <div className="flex items-center gap-2">
              {STEPS.map((s, index) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    index <= stepIndex ? "bg-primary" : "bg-outline-variant"
                  }`}
                />
              ))}
            </div>
            <h2 className="font-display text-headline-lg text-on-surface tracking-tight">{STEP_LABELS[step]}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Étape {stepIndex + 1} sur {STEPS.length}
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm">
              {error}
              {step === "email" && (
                <>
                  {" "}
                  <Link className="font-semibold underline" href="/">Se connecter</Link>
                </>
              )}
            </div>
          )}

          {/* <!-- Step 1: Email --> */}
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
                    autoFocus
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

          {/* <!-- Step 2: Full Name --> */}
          {step === "name" && (
            <form className="space-y-lg" onSubmit={handleNameSubmit}>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="fullName">Nom complet</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Person />
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    id="fullName"
                    name="fullName"
                    placeholder="Jane Doe"
                    type="text"
                    required
                    autoFocus
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-md">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3.5 border border-outline-variant rounded-lg font-display text-body-lg font-semibold text-on-surface-variant hover:bg-surface-container-low transition-all"
                  type="button"
                  onClick={goBack}
                >
                  <ArrowBack />
                </button>
                <button
                  className="flex-1 py-3.5 bg-primary text-white font-display text-body-lg font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/30 transform active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2"
                  type="submit"
                >
                  Continuer
                  <ArrowForward />
                </button>
              </div>
            </form>
          )}

          {/* <!-- Step 3: Password --> */}
          {step === "password" && (
            <form className="space-y-lg" onSubmit={handlePasswordSubmit}>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="password">Mot de passe</label>
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
                    minLength={8}
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

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="confirm-password">Confirmer le mot de passe</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock />
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    id="confirm-password"
                    name="confirm-password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-md">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3.5 border border-outline-variant rounded-lg font-display text-body-lg font-semibold text-on-surface-variant hover:bg-surface-container-low transition-all"
                  type="button"
                  onClick={goBack}
                >
                  <ArrowBack />
                </button>
                <button
                  className="flex-1 py-3.5 bg-primary text-white font-display text-body-lg font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/30 transform active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2"
                  type="submit"
                >
                  Continuer
                  <ArrowForward />
                </button>
              </div>
            </form>
          )}

          {/* <!-- Step 4: Workspace --> */}
          {step === "workspace" && (
            <form className="space-y-lg" onSubmit={handleWorkspaceSubmit}>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1" htmlFor="workspaceName">Nom du workspace</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Apartment />
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-outline-variant"
                    id="workspaceName"
                    name="workspaceName"
                    placeholder="mon-workspace"
                    type="text"
                    required
                    autoFocus
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                  />
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant ml-1">
                  Vous pourrez inviter votre équipe une fois le workspace créé.
                </p>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant ml-1">Type de workspace</label>
                <div className="grid grid-cols-2 gap-sm">
                  {WORKSPACE_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setWorkspaceType(option.value)}
                      className={`text-left p-3 rounded-lg border transition-all space-y-1 ${
                        workspaceType === option.value
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-on-surface">
                        {option.icon}
                        <span className="font-body-md text-body-md font-semibold">{option.label}</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-md">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3.5 border border-outline-variant rounded-lg font-display text-body-lg font-semibold text-on-surface-variant hover:bg-surface-container-low transition-all"
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                >
                  <ArrowBack />
                </button>
                <button
                  className="flex-1 py-3.5 bg-primary text-white font-display text-body-lg font-semibold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/30 transform active:scale-[0.98] transition-all duration-100 flex items-center justify-center gap-2 disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Création..." : "Créer mon compte"}
                  <ArrowForward />
                </button>
              </div>
            </form>
          )}

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link className="text-primary font-semibold hover:underline" href="/">Sign in</Link>
          </p>
        </div>
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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
