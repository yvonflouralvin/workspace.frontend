"use client";

import { useEffect, useState } from "react";
import { AddOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateEmployeeModal } from "@/components/CreateEmployeeModal";
import { listEmployees, ApiError, type Employee } from "@/app/lib/api";

export default function EmployeesPage() {
  const { can } = usePermissions();
  const canView = can("hr.employees.view");
  const canManage = can("hr.employees.manage");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    listEmployees()
      .then(setEmployees)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [canView]);

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

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {canView && loading && <p className="text-sm text-on-surface-variant">Chargement…</p>}

        {canView && !loading && !error && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  <th className="px-5 py-3 font-medium">Employé</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Groupe / Département</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-5 py-3 text-on-surface">
                      {employee.first_name} {employee.last_name}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{employee.email}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{employee.group_name}</td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-on-surface-variant">
                      Aucun employé pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateEmployeeModal
          onClose={() => setShowCreate(false)}
          onCreated={(employee) => setEmployees((prev) => [...prev, employee])}
        />
      )}
    </DashboardShell>
  );
}
