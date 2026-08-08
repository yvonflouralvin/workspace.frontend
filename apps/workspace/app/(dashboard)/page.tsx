"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CloseOutlined,
  CheckOutlined,
  FolderOpenOutlined,
  NotificationsOutlined,
  PersonAddOutlined,
  PlaylistAddCheckOutlined,
  SettingsOutlined,
  AddOutlined,
} from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useNotifications } from "@repo/notifications/hooks/useNotifications";
import { listTasks as listApprovalTasks, decideRequest } from "@repo/approval-flows/api/client";
import type { RequestSummary } from "@repo/approval-flows/types/request";
import { Avatar } from "@repo/ui/Avatar";
import { Chip } from "@repo/ui/Chip";
import { KpiCard } from "@repo/ui/KpiCard";
import { Toast } from "@repo/ui/Toast";
import { projectsApi, toneFor, type Project, type Task } from "@/app/lib/projects-api";
import { listAuditLogs, listNotificationChannels, listMembers } from "@/app/lib/api";
import type { AuditLog } from "@/app/lib/types";
import { AccueilRaccourcis } from "@/components/AccueilRaccourcis";

const SECTION_LABEL = "text-label-sm uppercase text-outline";

const AUDIT_LABELS: Record<string, string> = {
  "auth.login_success": "s'est connecté",
  "auth.login_failed": "a échoué à se connecter",
  "auth.logout": "s'est déconnecté",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  return hour < 18 ? "Bon après-midi" : "Bonsoir";
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function isOverdue(task: Task): boolean {
  return Boolean(task.due_date) && new Date(task.due_date!).getTime() < Date.now();
}

/** Cle du refus, par workspace : masquer l'aide sur l'un ne doit pas la
 *  masquer sur un workspace tout neuf, ou elle a justement du sens. */
function cleOnboarding(workspaceId?: number | string) {
  return `onboarding-masque:${workspaceId ?? "?"}`;
}

export default function HomePage() {
  const { user, activeWorkspace, accueil } = useSessionStore();
  const { can } = usePermissions();
  const { unreadCount } = useNotifications("/api/notifications");

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<RequestSummary[]>([]);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [notificationsConfigured, setNotificationsConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingMasque, setOnboardingMasque] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const canInvite = can("members.invite");

  // Un groupe peut remplacer les widgets par des accès rapides. On le décide
  // AVANT de charger projets, tâches et journal : les afficher pour ne jamais
  // les montrer serait autant d'appels réseau pour rien.
  const raccourcis =
    accueil?.accueil_personnalise && (accueil.liens_rapides?.length ?? 0) > 0
      ? accueil
      : null;
  const canManageProjects = can("projects.manage");
  const canManageSettings = can("workspace.settings.manage");
  const workspaceId = activeWorkspace?.id;

  useEffect(() => {
    if (raccourcis) {
      setLoading(false);
      return;
    }
    Promise.all([
      projectsApi.listProjects().catch(() => [] as Project[]),
      projectsApi.myTasks().catch(() => [] as Task[]),
    ])
      .then(([p, t]) => {
        setProjects(p);
        setTasks(t);
      })
      .finally(() => setLoading(false));
  }, []);

  // Blocs facultatifs : chaque source est gardée par sa permission et n'échoue
  // jamais la page — un bloc sans droit ou sans donnée disparaît, c'est tout.
  useEffect(() => {
    if (raccourcis) return;
    listApprovalTasks().then(setApprovals).catch(() => setApprovals([]));
  }, [raccourcis]);

  useEffect(() => {
    if (!can("audit_logs.view")) return;
    listAuditLogs({ limit: 5 }).then((res) => setActivity(res.logs)).catch(() => {});
  }, [can]);

  // Le refus est relu a chaque workspace : il est porte par la cle.
  useEffect(() => {
    try {
      setOnboardingMasque(window.localStorage.getItem(cleOnboarding(workspaceId)) === "1");
    } catch {
      setOnboardingMasque(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !can("members.view")) return;
    listMembers(workspaceId, { limit: 1 })
      .then((res) => setMemberCount(res.total))
      .catch(() => {});
  }, [workspaceId, can]);

  useEffect(() => {
    if (!workspaceId || !canManageSettings) return;
    listNotificationChannels(workspaceId)
      .then((res) => setNotificationsConfigured(res.channels.some((c) => Boolean(c.config))))
      .catch(() => {});
  }, [workspaceId, canManageSettings]);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Refus mémorisé dans le navigateur : c'est un choix d'affichage propre à la
  // personne, pas une donnée du workspace. Un aller-retour serveur pour cacher
  // un encart serait disproportionné.
  const showOnboarding =
    !loading && !onboardingMasque && projects.length === 0 && (canManageProjects || canInvite);

  const overdue = tasks.filter(isOverdue).length;
  const totalTasks = projects.reduce((sum, p) => sum + (p.task_count ?? 0), 0);

  async function decide(request: RequestSummary, decision: "approve" | "reject") {
    try {
      await decideRequest(request.id, { decision });
      setApprovals((prev) => prev.filter((r) => r.id !== request.id));
      setToast({
        message: decision === "approve" ? "Demande approuvée." : "Demande refusée.",
        tone: "success",
      });
    } catch {
      setToast({ message: "La décision n'a pas pu être enregistrée.", tone: "error" });
    }
  }

  if (raccourcis) {
    return <AccueilRaccourcis accueil={raccourcis} prenom={user?.username} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <div className="mb-7">
        <h1 className="font-display text-headline-md text-on-surface">
          {greeting()}, {user?.username ?? "…"}
        </h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          {activeWorkspace?.name ?? "Chargement…"} · {today}
        </p>
      </div>

      {showOnboarding ? (
        <Onboarding
          workspaceName={activeWorkspace?.name}
          hasProjet={projects.length > 0}
          onMasquer={() => {
            setOnboardingMasque(true);
            try {
              window.localStorage.setItem(cleOnboarding(workspaceId), "1");
            } catch {
              // Navigation privée, stockage refusé : le masquage ne tiendra pas
              // au rechargement, mais il fonctionne pour la session en cours.
            }
          }}
          hasTeam={memberCount === null ? null : memberCount > 1}
          hasNotifications={notificationsConfigured}
          canInvite={canInvite}
          canManageProjects={canManageProjects}
          canManageSettings={canManageSettings}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
            <KpiCard
              label="Mes tâches ouvertes"
              value={loading ? "—" : tasks.length}
              icon={<PlaylistAddCheckOutlined style={{ fontSize: 20 }} />}
              hint={
                loading
                  ? undefined
                  : overdue > 0
                    ? `${overdue} en retard`
                    : "Aucune échéance dépassée"
              }
              hintTone={overdue > 0 ? "negative" : "neutral"}
              href="/projects"
            />
            <KpiCard
              label="Projets actifs"
              value={loading ? "—" : projects.length}
              icon={<FolderOpenOutlined style={{ fontSize: 20 }} />}
              hint={loading ? undefined : `${totalTasks} tâche${totalTasks > 1 ? "s" : ""} au total`}
              href="/projects"
            />
            <KpiCard
              label="Notifications non lues"
              value={unreadCount}
              icon={<NotificationsOutlined style={{ fontSize: 20 }} />}
              hint={unreadCount === 0 ? "Tout est lu" : undefined}
              href="/notifications"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="flex flex-col gap-6">
              <MyWork tasks={tasks} loading={loading} />
              {approvals.length > 0 && (
                <Approvals requests={approvals} onDecide={decide} />
              )}
            </div>

            <div className="flex flex-col gap-6">
              <QuickActions
                canManageProjects={canManageProjects}
                canInvite={canInvite}
                canManageSettings={canManageSettings}
              />
              {can("audit_logs.view") && <RecentActivity events={activity} />}
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Onboarding({
  workspaceName,
  hasProjet,
  hasTeam,
  hasNotifications,
  canInvite,
  canManageProjects,
  canManageSettings,
  onMasquer,
}: {
  workspaceName?: string;
  hasProjet: boolean;
  hasTeam: boolean | null;
  hasNotifications: boolean | null;
  canInvite: boolean;
  canManageProjects: boolean;
  canManageSettings: boolean;
  onMasquer: () => void;
}) {
  const steps = [
    { label: "Créer votre compte", done: true, action: null, href: null },
    { label: "Nommer votre workspace", done: true, action: null, href: null },
    {
      label: "Inviter votre équipe",
      done: hasTeam === true,
      action: canInvite && hasTeam !== true ? "Inviter" : null,
      href: "/members?add=1",
    },
    {
      label: "Créer un premier projet",
      done: hasProjet,
      action: canManageProjects ? "Créer" : null,
      href: "/projects?create=1",
    },
    {
      label: "Configurer les notifications",
      done: hasNotifications === true,
      action: canManageSettings && hasNotifications !== true ? "Configurer" : null,
      href: "/settings",
    },
  ];

  const done = steps.filter((s) => s.done).length;

  return (
    <div className="relative rounded-2xl border border-outline-soft bg-gradient-to-b from-surface-container-low to-surface-container-lowest p-7">
      <p className="font-display text-lg font-semibold text-on-surface">
        Bienvenue dans {workspaceName ?? "votre workspace"} 👋
      </p>
      <p className="text-body-md text-on-surface-variant mt-1 max-w-[520px]">
        Quelques étapes pour préparer votre workspace. Vous pourrez y revenir à tout moment.
      </p>
      <button
        type="button"
        onClick={onMasquer}
        className="absolute right-5 top-5 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
      >
        <CloseOutlined style={{ fontSize: 15 }} />
        Masquer
      </button>

      <div className="flex items-center gap-2.5 mt-4">
        <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width]"
            style={{ width: `${(done / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-body-sm font-semibold text-primary">
          {done} / {steps.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 mt-4.5">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-outline-soft bg-surface-container-lowest"
          >
            <span
              className={`w-[22px] h-[22px] flex-none rounded-full inline-flex items-center justify-center ${
                step.done
                  ? "bg-secondary text-on-secondary"
                  : "border-[1.5px] border-outline-variant"
              }`}
            >
              {step.done && <CheckOutlined style={{ fontSize: 13 }} />}
            </span>
            <span
              className={`flex-1 text-body-md font-medium ${
                step.done ? "text-outline line-through" : "text-on-surface"
              }`}
            >
              {step.label}
            </span>
            {step.action && step.href && (
              <Link href={step.href} className="text-body-sm font-semibold text-primary">
                {step.action}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MyWork({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  const rows = [...tasks]
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 6);

  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className={SECTION_LABEL}>Mon travail</h2>
        <Link href="/projects" className="text-label-md font-semibold text-primary">
          Tout voir
        </Link>
      </div>
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        {loading ? (
          <p className="px-4 py-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
            Aucune tâche ne vous est assignée. 🎉
          </p>
        ) : (
          rows.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${task.project_id}?task=${task.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
            >
              <span
                className={`w-2 h-2 flex-none rounded-full ${toneFor(task.categorie).dot}`}
              />
              <span className="flex-none font-mono text-label-md text-outline">
                {task.project_key}-{task.number}
              </span>
              <span className="flex-1 min-w-0 truncate text-body-md text-on-surface">
                {task.title}
              </span>
              {task.project_key && (
                <Chip size="sm" tone="primary">
                  {task.project_key}
                </Chip>
              )}
              <span
                className={`w-16 flex-none text-right text-label-md ${
                  isOverdue(task) ? "text-error font-semibold" : "text-outline"
                }`}
              >
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—"}
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function Approvals({
  requests,
  onDecide,
}: {
  requests: RequestSummary[];
  onDecide: (request: RequestSummary, decision: "approve" | "reject") => void;
}) {
  return (
    <section>
      <h2 className={`${SECTION_LABEL} mb-2.5`}>
        Mes approbations <span className="text-primary">{requests.length}</span>
      </h2>
      <div className="flex flex-col gap-2.5">
        {requests.slice(0, 3).map((request) => (
          <div
            key={request.id}
            className="flex items-center gap-3 rounded-xl border border-outline-soft bg-surface-container-lowest px-4 py-3.5"
          >
            <Avatar initials={request.flow_title.slice(0, 1).toUpperCase()} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-medium text-on-surface truncate">
                {request.flow_title}
              </p>
              <p className="text-label-md text-outline">
                Étape {request.current_step_order} · {relativeTime(request.created_at)}
              </p>
            </div>
            <button
              onClick={() => onDecide(request, "reject")}
              className="h-8 px-3 rounded-lg border border-outline-soft text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={() => onDecide(request, "approve")}
              className="h-8 px-3 rounded-lg bg-secondary text-on-secondary text-label-md font-semibold hover:opacity-90 transition-opacity"
            >
              Approuver
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickActions({
  canManageProjects,
  canInvite,
  canManageSettings,
}: {
  canManageProjects: boolean;
  canInvite: boolean;
  canManageSettings: boolean;
}) {
  const actions = [
    {
      label: "Nouveau projet",
      href: "/projects?create=1",
      icon: <AddOutlined style={{ fontSize: 20 }} />,
      visible: canManageProjects,
    },
    {
      label: "Inviter un membre",
      href: "/members?add=1",
      icon: <PersonAddOutlined style={{ fontSize: 20 }} />,
      visible: canInvite,
    },
    {
      label: "Configurer les notifications",
      href: "/settings",
      icon: <SettingsOutlined style={{ fontSize: 20 }} />,
      visible: canManageSettings,
    },
  ].filter((a) => a.visible);

  if (actions.length === 0) return null;

  return (
    <section>
      <h2 className={`${SECTION_LABEL} mb-2.5`}>Accès rapides</h2>
      <div className="flex flex-col gap-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-outline-soft bg-surface-container-lowest text-body-md font-medium text-on-surface hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <span className="w-5 h-5 flex-none inline-flex items-center justify-center text-primary">
              {action.icon}
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentActivity({ events }: { events: AuditLog[] }) {
  return (
    <section>
      <h2 className={`${SECTION_LABEL} mb-2.5`}>Activité récente</h2>
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4">
        {events.length === 0 ? (
          <p className="py-6 text-body-sm text-on-surface-variant">Aucune activité récente.</p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 py-3 border-b border-hairline last:border-b-0"
            >
              <Avatar name={event.user_email} letters={1} size={28} />
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-on-surface leading-[18px]">
                  <span className="font-semibold">{event.user_email.split("@")[0]}</span>{" "}
                  {AUDIT_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p className="text-[11px] text-status-backlog mt-0.5">
                  {relativeTime(event.occurred_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
