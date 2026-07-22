"use client";

import { LogoutOutlined } from "@mui/icons-material";
import { UserSummary } from "../types/shell";
import { Avatar } from "../Avatar";
import { useSidebarMode } from "./AppShell";

interface UserFooterProps {
  user: UserSummary | null;
  onLogout: () => void;
  /** Ligne secondaire sous le nom — rôle dans le workspace ; l'email par défaut. */
  subtitle?: string;
}

export function UserFooter({ user, onLogout, subtitle }: UserFooterProps) {
  const expanded = useSidebarMode() === "expanded";

  if (!user) return null;

  return (
    <div className={`flex items-center gap-2.5 ${expanded ? "" : "justify-center lg:justify-start"}`}>
      <Avatar name={user.username ?? user.email} size={30} variant="solid" />
      <div className={`flex-1 min-w-0 leading-tight ${expanded ? "" : "hidden lg:block"}`}>
        <p className="text-label-md font-semibold text-on-surface truncate">{user.username}</p>
        <p className="text-[11px] text-on-surface-variant truncate">{subtitle ?? user.email}</p>
      </div>
      <button
        onClick={onLogout}
        title="Se déconnecter"
        className={`w-7 h-7 flex-none flex items-center justify-center rounded-lg text-outline hover:bg-surface-container-low hover:text-error transition-colors ${
          expanded ? "" : "hidden lg:flex"
        }`}
      >
        <LogoutOutlined style={{ fontSize: 16 }} />
      </button>
    </div>
  );
}
