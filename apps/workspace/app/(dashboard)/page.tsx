"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";
import { useNotifications } from "@repo/notifications/hooks/useNotifications";
import { projectsApi } from "@/app/lib/projects-api";
import {
  GroupOutlined,
  FolderOpenOutlined,
  NotificationsOutlined,
  AddOutlined,
  PersonAddOutlined,
} from "@mui/icons-material";

function StatCard({ label, value, icon, href }: { label: string; value: string | number; icon: React.ReactNode; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">{label}</p>
        <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-on-surface">{value}</p>
    </>
  );
  const cls = "flex flex-col gap-3 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant";
  if (href) {
    return (
      <Link href={href} className={`${cls} hover:border-primary/40 hover:bg-primary/5 transition-colors`}>
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

function QuickAction({ label, icon, href }: { label: string; icon: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm font-medium text-on-surface"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </a>
  );
}

export default function DashboardPage() {
  const { user, activeWorkspace } = useSessionStore();
  const { unreadCount } = useNotifications("/api/notifications");
  const [projectCount, setProjectCount] = useState<number | "—">("—");

  useEffect(() => {
    projectsApi.listProjects().then((p) => setProjectCount(p.length)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {greeting}, {user?.username ?? "…"}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {activeWorkspace?.name ?? "Chargement…"} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Membres"
          value="—"
          icon={<GroupOutlined style={{ fontSize: 20 }} />}
        />
        <StatCard
          label="Projets"
          value={projectCount}
          icon={<FolderOpenOutlined style={{ fontSize: 20 }} />}
          href="/projects"
        />
        <StatCard
          label="Notifications"
          value={unreadCount}
          icon={<NotificationsOutlined style={{ fontSize: 20 }} />}
          href="/notifications"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
          Accès rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction
            label="Nouveau projet"
            icon={<AddOutlined style={{ fontSize: 18 }} />}
            href="/projects/new"
          />
          <QuickAction
            label="Inviter un membre"
            icon={<PersonAddOutlined style={{ fontSize: 18 }} />}
            href="/members/invite"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
          Activité récente
        </h2>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-6 py-10 text-center">
          <p className="text-sm text-on-surface-variant">Aucune activité récente pour le moment.</p>
        </div>
      </div>
    </div>
  );
}
