"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GroupOutlined, WorkspacesOutlined } from "@mui/icons-material";
import { useProject } from "../project-context";

export default function MembersLayout({ children }: { children: ReactNode }) {
  const { projectId, isOwner } = useProject();
  const pathname = usePathname();
  const base = `/projects/${projectId}/members`;

  // Les groupes disent qui voit quoi : seul le propriétaire y accède.
  const tabs = [
    { href: base, label: "Membres", icon: <GroupOutlined style={{ fontSize: 17 }} /> },
    ...(isOwner
      ? [{ href: `${base}/groups`, label: "Groupes", icon: <WorkspacesOutlined style={{ fontSize: 17 }} /> }]
      : []),
  ];

  return (
    <div>
      {tabs.length > 1 && (
        <nav className="flex items-center gap-1 border-b border-outline-soft mb-5">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
      {children}
    </div>
  );
}
