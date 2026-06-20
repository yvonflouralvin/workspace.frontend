"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOutlined, PersonOutlined, AddOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { getGroup, getRootGroup, ApiError, type GroupDetail } from "@/app/lib/api";
import { CreateSubgroupModal } from "@/components/CreateSubgroupModal";

export function GroupFolderView({ groupId }: { groupId?: number }) {
  const { can } = usePermissions();
  const canView = can("hr.departments.view");
  const canManage = can("hr.departments.manage");

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Nouveau sous-groupe
          </button>
        )}
      </div>

      {group.children.length === 0 && group.employees.length === 0 && (
        <p className="text-sm text-on-surface-variant">Ce groupe est vide.</p>
      )}

      {group.children.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {group.children.map((child) => (
            <Link
              key={child.id}
              href={`/groups/${child.id}`}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container transition-colors text-center"
            >
              <FolderOutlined style={{ fontSize: 32 }} className="text-secondary" />
              <span className="text-sm font-medium text-on-surface truncate w-full">
                {child.name}
              </span>
            </Link>
          ))}
        </div>
      )}

      {group.employees.length > 0 && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                <th className="px-5 py-3 font-medium">Employé</th>
                <th className="px-5 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {group.employees.map((employee) => (
                <tr key={employee.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-5 py-3 text-on-surface flex items-center gap-2">
                    <PersonOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
                    {employee.first_name} {employee.last_name}
                  </td>
                  <td className="px-5 py-3 text-on-surface-variant">{employee.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateSubgroupModal
          parentId={group.id}
          parentName={group.name}
          onClose={() => setShowCreate(false)}
          onCreated={(created) =>
            setGroup((prev) =>
              prev
                ? {
                    ...prev,
                    children: [
                      ...prev.children,
                      { id: created.id, name: created.name, is_root: created.is_root },
                    ],
                  }
                : prev
            )
          }
        />
      )}
    </div>
  );
}
