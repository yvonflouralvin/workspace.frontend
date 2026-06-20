"use client";

import { useEffect, useMemo, useState } from "react";
import { AddOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { useGraphQLRecords } from "@repo/ui/hooks/useGraphQLRecords";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateEmployeeModal } from "@/components/CreateEmployeeModal";
import { listGroupOptions, type GroupOption } from "@/app/lib/api";

interface EmployeeRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  group_id: number;
}

export default function EmployeesPage() {
  const { can } = usePermissions();
  const canView = can("hr.employees.view");
  const canManage = can("hr.employees.manage");

  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const { items, total, loading, error, setQuery, setPage, refetch } =
    useGraphQLRecords<EmployeeRecord>({
      app: "hr",
      model: "employees",
      searchFields: ["first_name", "last_name", "email"],
      enabled: canView,
    });

  useEffect(() => {
    if (!canView) return;
    listGroupOptions().then(setGroupOptions).catch(() => {});
  }, [canView]);

  const groupPathById = useMemo(
    () => new Map(groupOptions.map((option) => [option.id, option.path])),
    [groupOptions]
  );

  const columns: DataListColumn<EmployeeRecord>[] = [
    {
      key: "name",
      header: "Employé",
      render: (employee) => `${employee.first_name} ${employee.last_name}`,
    },
    { key: "email", header: "Email", render: (employee) => employee.email },
    {
      key: "group",
      header: "Groupe / Département",
      render: (employee) => groupPathById.get(employee.group_id) ?? "—",
    },
  ];

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Employés</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Liste des employés et de leur groupe / département.
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouvel employé
            </button>
          )}
        </div>

        {!canView && (
          <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
            Accès restreint à cette section.
          </p>
        )}

        {canView && error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {canView && !error && (
          <DataList
            serverMode
            items={items}
            totalCount={total}
            loading={loading}
            columns={columns}
            getRowKey={(employee) => employee.id}
            onSearchChange={setQuery}
            onPageChange={setPage}
            searchPlaceholder="Rechercher un employé…"
            emptyMessage="Aucun employé pour le moment."
          />
        )}
      </div>

      {showCreate && (
        <CreateEmployeeModal onClose={() => setShowCreate(false)} onCreated={refetch} />
      )}
    </DashboardShell>
  );
}
