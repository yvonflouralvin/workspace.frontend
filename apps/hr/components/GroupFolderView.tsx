"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderOutlined,
  AddOutlined,
  EditOutlined,
  MoreHorizOutlined,
  AccountTreeOutlined,
  ViewColumnOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Avatar } from "@repo/ui/Avatar";
import { DropdownMenu, type DropdownMenuItem } from "@repo/ui/DropdownMenu";
import {
  getGroup,
  getRootGroup,
  ApiError,
  type GroupDetail,
  type GroupSummary,
} from "@/app/lib/api";
import { GroupFormDrawer } from "@/components/GroupFormDrawer";

// Accents stables par unité — mêmes teintes que les avatars employés.
const AVATAR_COLORS = [
  "#3525cd", "#006c49", "#004598", "#9a3412", "#7c3aed", "#b91c1c", "#0e7490", "#a16207",
];
const accentFor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

type OrgView = "chart" | "folder";

export function GroupFolderView({ groupId }: { groupId?: number }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hr.departments.view");
  const canManage = can("hr.departments.manage");

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [view, setView] = useState<OrgView>("chart");

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const request = groupId ? getGroup(groupId) : getRootGroup();
    request
      .then(setGroup)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [groupId, canView]);

  if (!canView) {
    return (
      <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
        Accès restreint à cette section.
      </p>
    );
  }

  if (error) {
    return <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>;
  }

  if (loading || !group) {
    return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  }

  const breadcrumb = [...group.ancestors, { id: group.id, name: group.name, is_root: group.is_root }];
  const managerName = group.manager
    ? `${group.manager.first_name} ${group.manager.last_name}`
    : null;

  const menuItems: DropdownMenuItem[] = canManage
    ? [
        {
          key: "edit",
          label: "Modifier l'unité",
          icon: <EditOutlined style={{ fontSize: 18 }} />,
          onClick: () => setFormMode("edit"),
        },
        {
          key: "create-subgroup",
          label: "Nouveau sous-groupe",
          icon: <AddOutlined style={{ fontSize: 18 }} />,
          onClick: () => setFormMode("create"),
        },
      ]
    : [];

  const toggle = (
    <div className="inline-flex p-0.5 rounded-lg bg-surface-container-low border border-outline-soft">
      {([
        { k: "chart", label: "Carte", icon: <AccountTreeOutlined style={{ fontSize: 15 }} /> },
        { k: "folder", label: "Dossier", icon: <ViewColumnOutlined style={{ fontSize: 15 }} /> },
      ] as const).map((v) => (
        <button
          key={v.k}
          onClick={() => setView(v.k)}
          className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-body-sm font-semibold transition-colors ${
            view === v.k
              ? "bg-surface-container-lowest text-primary shadow-button"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {v.icon}
          {v.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="basis-full md:basis-0 md:flex-1 min-w-0">
          <h1 className="font-display text-headline-md text-on-surface">Organigramme</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Structure de l&apos;organisation, responsables et effectifs.
          </p>
        </div>
        {toggle}
        {menuItems.length > 0 && (
          <DropdownMenu
            label="Options"
            icon={<MoreHorizOutlined style={{ fontSize: 18 }} />}
            items={menuItems}
          />
        )}
      </div>

      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1.5 text-body-sm flex-wrap">
        {breadcrumb.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-outline-variant">/</span>}
            {node.id === group.id ? (
              <span className="text-on-surface font-semibold">{node.name}</span>
            ) : (
              <Link
                href={node.is_root ? "/groups" : `/groups/${node.id}`}
                className="text-primary font-medium hover:underline"
              >
                {node.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {view === "chart" ? (
        <ChartView
          group={group}
          managerName={managerName}
          onOpen={(id) => router.push(`/groups/${id}`)}
        />
      ) : (
        <FolderView
          group={group}
          onOpenGroup={(id) => router.push(`/groups/${id}`)}
          onOpenEmployee={(id) => router.push(`/employees/${id}`)}
        />
      )}

      {formMode === "create" && (
        <GroupFormDrawer
          mode="create"
          parentId={group.id}
          parentName={group.name}
          onClose={() => setFormMode(null)}
          onSaved={(created) =>
            setGroup((prev) =>
              prev
                ? {
                    ...prev,
                    children: [
                      ...prev.children,
                      {
                        id: created.id,
                        name: created.name,
                        is_root: created.is_root,
                        subgroup_count: 0,
                        employee_count: 0,
                      },
                    ],
                  }
                : prev
            )
          }
        />
      )}

      {formMode === "edit" && (
        <GroupFormDrawer
          mode="edit"
          group={group}
          onClose={() => setFormMode(null)}
          onSaved={setGroup}
        />
      )}
    </div>
  );
}

function NodeCard({
  id,
  title,
  subtitle,
  count,
  countSuffix,
  width,
  onClick,
  highlight,
}: {
  id: number;
  title: string;
  subtitle: string | null;
  count: number;
  countSuffix?: string;
  width: number;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <Avatar
        name={title}
        letters={1}
        size={40}
        variant="solid"
        color={accentFor(id)}
        className="mx-auto mb-2"
      />
      <p className="text-body-sm font-semibold text-on-surface truncate">{title}</p>
      {subtitle && <p className="text-label-md text-outline truncate">{subtitle}</p>}
      <p className="text-label-md font-semibold text-primary mt-1.5">
        {count} employé{count > 1 ? "s" : ""}
        {countSuffix ? <span className="text-outline font-normal"> {countSuffix}</span> : null}
      </p>
    </>
  );

  const base = `rounded-2xl p-3.5 text-center ${
    highlight
      ? "border border-primary/40 bg-primary/[0.04] shadow-card"
      : "border border-outline-soft bg-surface-container-lowest"
  }`;

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{ width }}
        className={`${base} flex-none hover:border-primary/40 hover:bg-primary/[0.03] transition-colors`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div style={{ width }} className={`${base} flex-none`}>
      {inner}
    </div>
  );
}

function ChartView({
  group,
  managerName,
  onOpen,
}: {
  group: GroupDetail;
  managerName: string | null;
  onOpen: (id: number) => void;
}) {
  const totalEmployees =
    group.employees.length + group.children.reduce((sum, c) => sum + c.employee_count, 0);
  const children = group.children;
  const scrollRef = useRef<HTMLDivElement>(null);

  // L'arbre est plus large que l'écran dès qu'il y a beaucoup d'unités : on
  // centre le défilement sur la racine pour qu'elle soit visible au chargement.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [group.id, children.length]);

  return (
    <div
      ref={scrollRef}
      className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-6 md:p-8 overflow-x-auto"
    >
      <div className="flex flex-col items-center min-w-max mx-auto">
        <NodeCard
          id={group.id}
          title={group.name}
          subtitle={managerName}
          count={totalEmployees}
          width={220}
          highlight
        />

        {children.length > 0 && (
          <>
            <div className="w-0.5 h-6 bg-track" />
            <div className="relative flex justify-center gap-6">
              {children.length > 1 && (
                <div className="absolute top-0 h-0.5 bg-track" style={{ left: 90, right: 90 }} />
              )}
              {children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-0.5 h-6 bg-track" />
                  <NodeCard
                    id={child.id}
                    title={child.name}
                    subtitle={null}
                    count={child.employee_count}
                    countSuffix={
                      child.subgroup_count > 0
                        ? `· ${child.subgroup_count} s-grp`
                        : undefined
                    }
                    width={180}
                    onClick={() => onOpen(child.id)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {children.length === 0 && (
          <p className="mt-4 text-body-sm text-on-surface-variant">
            Aucune sous-unité. {group.employees.length} employé
            {group.employees.length > 1 ? "s" : ""} rattaché
            {group.employees.length > 1 ? "s" : ""} directement.
          </p>
        )}
      </div>
    </div>
  );
}

function FolderView({
  group,
  onOpenGroup,
  onOpenEmployee,
}: {
  group: GroupDetail;
  onOpenGroup: (id: number) => void;
  onOpenEmployee: (id: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
      <div className="flex flex-col md:flex-row md:min-h-[360px]">
        {/* Sous-groupes */}
        <div className="flex-1 md:border-r border-hairline p-2">
          <p className="text-label-sm uppercase text-outline px-2.5 py-2">Sous-groupes</p>
          {group.children.length === 0 ? (
            <p className="px-2.5 py-4 text-body-sm text-on-surface-variant">Aucun sous-groupe.</p>
          ) : (
            group.children.map((child: GroupSummary) => (
              <button
                key={child.id}
                onClick={() => onOpenGroup(child.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors text-left"
              >
                <FolderOutlined style={{ fontSize: 18 }} className="text-outline flex-none" />
                <span className="flex-1 min-w-0 text-body-sm font-medium text-on-surface truncate">
                  {child.name}
                </span>
                <span className="text-label-md text-outline tabular-nums">{child.employee_count}</span>
                <ChevronRightOutlined style={{ fontSize: 16 }} className="text-outline-variant flex-none" />
              </button>
            ))
          )}
        </div>

        {/* Employés */}
        <div className="md:flex-[1.4] p-2 border-t md:border-t-0 border-hairline">
          <p className="text-label-sm uppercase text-outline px-2.5 py-2 truncate">
            Employés · {group.name}
          </p>
          {group.employees.length === 0 ? (
            <p className="px-2.5 py-4 text-body-sm text-on-surface-variant">
              Aucun employé directement dans cette unité.
            </p>
          ) : (
            group.employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => onOpenEmployee(emp.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-container-low transition-colors text-left"
              >
                <Avatar
                  name={`${emp.first_name} ${emp.last_name}`}
                  letters={2}
                  size={28}
                  variant="solid"
                  color={accentFor(emp.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium text-on-surface truncate">
                    {emp.first_name} {emp.last_name}
                  </span>
                  <span className="block text-label-md text-outline truncate">{emp.email}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
