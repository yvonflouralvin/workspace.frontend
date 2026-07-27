"use client";

import { ChevronLeftOutlined, ChevronRightOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { Chip } from "@repo/ui/Chip";
import type { Member } from "@/app/lib/types";
import { ROLE_LABELS, ROLE_TONES, memberRole } from "@/app/lib/members";

const COLUMNS = [
  { key: "role", label: "Rôle", width: "w-24" },
  { key: "groups", label: "Groupes", width: "w-[150px]" },
  { key: "last", label: "Dernière connexion", width: "w-[120px]" },
  { key: "status", label: "Statut", width: "w-24" },
];

export function MembersTable({
  members,
  total,
  page,
  pageSize,
  loading,
  currentUserId,
  onOpen,
  onPageChange,
}: {
  members: Member[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  currentUserId?: number;
  onOpen: (member: Member) => void;
  onPageChange: (page: number) => void;
}) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
        <span className="flex-1">Membre</span>
        {COLUMNS.map((c) => (
          <span key={c.key} className={`${c.width} flex-none`}>
            {c.label}
          </span>
        ))}
      </div>

      {loading ? (
        <SkeletonRows />
      ) : members.length === 0 ? (
        <p className="px-5 py-10 text-center text-body-md text-on-surface-variant">
          Aucun membre ne correspond à cette recherche.
        </p>
      ) : (
        members.map((member) => {
          const role = memberRole(member);
          return (
            <button
              key={member.id}
              onClick={() => onOpen(member)}
              className="w-full flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3.5 md:py-3 text-left border-b border-hairline hover:bg-surface-container-low transition-colors"
            >
              <span className="w-full md:flex-1 min-w-0 flex items-center gap-3">
                <Avatar name={member.user.username} letters={1} size={32} />
                <span className="min-w-0">
                  <span className="block text-body-md font-medium text-on-surface truncate">
                    {member.user.username}
                    {member.user.id === currentUserId && (
                      <span className="ml-1.5 text-label-md font-normal text-outline">(vous)</span>
                    )}
                  </span>
                  <span className="block text-label-md text-outline truncate">
                    {member.user.email}
                  </span>
                </span>
              </span>

              <span className="md:w-24 flex-none">
                <Chip tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Chip>
              </span>

              <span className="md:w-[150px] flex-none flex flex-wrap gap-1">
                {member.groups.length === 0 ? (
                  <span className="hidden md:inline text-label-md text-outline">—</span>
                ) : (
                  member.groups.map((g) => (
                    <Chip key={g.id} size="sm">
                      {g.name}
                    </Chip>
                  ))
                )}
              </span>

              <span className="hidden md:inline w-[120px] flex-none text-body-sm text-on-surface-variant">
                {member.last_login_at
                  ? new Date(member.last_login_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—"}
              </span>

              <span className="md:w-24 flex-none">
                {member.is_active === false ? (
                  <Chip tone="warning">Suspendu</Chip>
                ) : (
                  <Chip tone="success">Actif</Chip>
                )}
              </span>
            </button>
          );
        })
      )}

      <div className="flex items-center justify-between px-4 md:px-5 py-3 text-body-sm text-outline">
        <span>
          {total === 0 ? "Aucun membre" : `${from}–${to} sur ${total}`}
        </span>
        <div className="flex gap-1">
          <PageButton
            label="Page précédente"
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftOutlined style={{ fontSize: 15 }} />
          </PageButton>
          <PageButton
            label="Page suivante"
            disabled={page >= lastPage}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightOutlined style={{ fontSize: 15 }} />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 disabled:hover:bg-surface-container-lowest transition-colors"
    >
      {children}
    </button>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 md:px-5 py-3 border-b border-hairline">
          <div className="flex-1 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-container-low animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-surface-container-low animate-pulse" />
              <div className="h-2.5 w-40 rounded bg-surface-container-low animate-pulse" />
            </div>
          </div>
          <div className="hidden md:block w-24 h-5 rounded bg-surface-container-low animate-pulse" />
          <div className="hidden md:block w-[150px] h-5 rounded bg-surface-container-low animate-pulse" />
          <div className="hidden md:block w-[120px] h-4 rounded bg-surface-container-low animate-pulse" />
          <div className="hidden md:block w-24 h-5 rounded bg-surface-container-low animate-pulse" />
        </div>
      ))}
    </div>
  );
}
