"use client";

import { LogoutOutlined } from "@mui/icons-material";
import { UserSummary } from "../types/shell";

interface UserFooterProps {
  user: UserSummary | null;
  onLogout: () => void;
}

export function UserFooter({ user, onLogout }: UserFooterProps) {
  if (!user) return null;

  const initials = (user.username ?? user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-on-surface truncate">{user.username}</p>
        <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
      </div>
      <button
        onClick={onLogout}
        title="Se déconnecter"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors flex-shrink-0"
      >
        <LogoutOutlined style={{ fontSize: 16 }} />
      </button>
    </div>
  );
}
