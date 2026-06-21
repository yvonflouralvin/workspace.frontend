"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderOutlined,
  PersonOutlined,
  PeopleOutlined,
  AddOutlined,
  EditOutlined,
  MoreHorizOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DropdownMenu, type DropdownMenuItem } from "@repo/ui/DropdownMenu";
import {
  getGroup,
  getRootGroup,
  ApiError,
  type GroupDetail,
  type GroupSummary,
  type EmployeeSummary,
} from "@/app/lib/api";
import { GroupFormDrawer } from "@/components/GroupFormDrawer";

const SUBGROUP_COLUMNS: DataListColumn<GroupSummary>[] = [
  {
    key: "name",
    header: "Sous-groupe",
    render: (subgroup) => (
      <div className="flex items-center justify-between gap-3 w-full">
        <span className="flex items-center gap-2">
          <FolderOutlined style={{ fontSize: 18 }} className="text-secondary" />
          {subgroup.name}
        </span>
        <span className="flex items-center gap-3 text-xs text-on-surface-variant shrink-0">
          <span className="flex items-center gap-1" title="Sous-groupes (total)">
            <FolderOutlined style={{ fontSize: 14 }} />
            {subgroup.subgroup_count}
          </span>
          <span className="flex items-center gap-1" title="Employés (total)">
            <PersonOutlined style={{ fontSize: 14 }} />
            {subgroup.employee_count}
          </span>
        </span>
      </div>
    ),
  },
];

const EMPLOYEE_COLUMNS: DataListColumn<EmployeeSummary>[] = [
  {
    key: "name",
    header: "Employé",
    render: (employee) => (
      <span className="flex items-center gap-2">
        <PersonOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
        {employee.first_name} {employee.last_name}
      </span>
    ),
  },
  { key: "email", header: "Email", render: (employee) => employee.email },
];

export function GroupFolderView({ groupId }: { groupId?: number }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hr.departments.view");
  const canManage = can("hr.departments.manage");

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [showEmployees, setShowEmployees] = useState(false);

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
      <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
        Accès restreint à cette section.
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
    );
  }

  if (loading || !group) {
    return <p className="text-sm text-on-surface-variant">Chargement…</p>;
  }

  const breadcrumb = [...group.ancestors, { id: group.id, name: group.name, is_root: group.is_root }];

  const menuItems: DropdownMenuItem[] = [
    {
      key: "members",
      label: `Membres (${group.employees.length})`,
      icon: <PeopleOutlined style={{ fontSize: 18 }} />,
      onClick: () => setShowEmployees(true),
    },
    ...(canManage
      ? [
          {
            key: "edit",
            label: "Modifier le groupe",
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
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant flex-wrap">
            {breadcrumb.map((node, i) => (
              <span key={node.id} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {node.id === group.id ? (
                  <span className="text-on-surface font-medium">{node.name}</span>
                ) : (
                  <Link
                    href={node.is_root ? "/groups" : `/groups/${node.id}`}
                    className="hover:text-on-surface transition-colors"
                  >
                    {node.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <p className="text-xs text-on-surface-variant">
            Responsable :{" "}
            {group.manager ? (
              <span className="text-on-surface font-medium">
                {group.manager.first_name} {group.manager.last_name}
              </span>
            ) : (
              "aucun"
            )}
          </p>
        </div>

        <DropdownMenu
          label="Options"
          icon={<MoreHorizOutlined style={{ fontSize: 18 }} />}
          items={menuItems}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-on-surface-variant">Sous-groupes</h2>
        <DataList
          items={group.children}
          columns={SUBGROUP_COLUMNS}
          getRowKey={(subgroup) => subgroup.id}
          searchText={(subgroup) => subgroup.name}
          searchPlaceholder="Rechercher un sous-groupe…"
          emptyMessage="Aucun sous-groupe."
          onRowClick={(subgroup) => router.push(`/groups/${subgroup.id}`)}
          maxHeight="max-h-[40vh]"
        />
      </div>

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

      {showEmployees && (
        <RightDrawer
          title="Employés de ce groupe"
          onClose={() => setShowEmployees(false)}
          contentClassName=""
        >
          <DataList
            items={group.employees}
            columns={EMPLOYEE_COLUMNS}
            getRowKey={(employee) => employee.id}
            onRowClick={(employee) => router.push(`/employees/${employee.id}`)}
            searchText={(employee) => `${employee.first_name} ${employee.last_name} ${employee.email}`}
            searchPlaceholder="Rechercher un employé…"
            emptyMessage="Aucun employé directement dans ce groupe."
            maxHeight="h-full"
            bare
          />
        </RightDrawer>
      )}
    </div>
  );
}
