"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowBackOutlined,
  WorkOutlined,
  ApartmentOutlined,
  EmailOutlined,
  HomeOutlined,
  PhoneOutlined,
  EditOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Tabs } from "@repo/ui/Tabs";
import { getEmployee, ApiError, type Employee } from "@/app/lib/api";
import { EmployeeGeneralEditDrawer } from "@/components/EmployeeGeneralEditDrawer";
import { EmployeeBasicInfoEditDrawer } from "@/components/EmployeeBasicInfoEditDrawer";

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-on-surface-variant">{icon}</span>
      <span className="text-on-surface-variant w-28 shrink-0">{label}</span>
      <span className="text-on-surface">{value || "—"}</span>
    </div>
  );
}

export function EmployeeDetailView({ employeeId }: { employeeId: number }) {
  const { can } = usePermissions();
  const canView = can("hr.employees.view");
  const canManage = can("hr.employees.manage");

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGeneralEdit, setShowGeneralEdit] = useState(false);
  const [showBasicEdit, setShowBasicEdit] = useState(false);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    getEmployee(employeeId)
      .then(setEmployee)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [employeeId, canView]);

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

  if (loading || !employee) {
    return <p className="text-sm text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <ArrowBackOutlined style={{ fontSize: 16 }} />
        Retour aux employés
      </Link>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-on-surface">
            {employee.first_name} {employee.last_name}
          </h1>
          {canManage && (
            <button
              onClick={() => setShowBasicEdit(true)}
              title="Modifier les informations de base"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <EditOutlined style={{ fontSize: 18 }} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoRow icon={<WorkOutlined style={{ fontSize: 18 }} />} label="Fonction" value={employee.job_title} />
          <InfoRow
            icon={<ApartmentOutlined style={{ fontSize: 18 }} />}
            label="Département"
            value={employee.group_name}
          />
          <InfoRow icon={<EmailOutlined style={{ fontSize: 18 }} />} label="Email" value={employee.email} />
        </div>
      </div>

      <Tabs
        tabs={[
          {
            key: "general",
            label: "Général",
            content: (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-on-surface-variant">
                    Informations générales
                  </h3>
                  {canManage && (
                    <button
                      onClick={() => setShowGeneralEdit(true)}
                      title="Modifier les informations générales"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      <EditOutlined style={{ fontSize: 18 }} />
                    </button>
                  )}
                </div>
                <InfoRow
                  icon={<HomeOutlined style={{ fontSize: 18 }} />}
                  label="Adresse"
                  value={employee.address}
                />
                <InfoRow
                  icon={<PhoneOutlined style={{ fontSize: 18 }} />}
                  label="Téléphone"
                  value={employee.phone}
                />
              </div>
            ),
          },
          {
            key: "contrat",
            label: "Contrat",
            content: (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6">
                <p className="text-sm text-on-surface-variant">
                  Aucune information de contrat pour le moment — cet onglet sera enrichi
                  prochainement.
                </p>
              </div>
            ),
          },
        ]}
      />

      {showGeneralEdit && (
        <EmployeeGeneralEditDrawer
          employee={employee}
          onClose={() => setShowGeneralEdit(false)}
          onSaved={setEmployee}
        />
      )}

      {showBasicEdit && (
        <EmployeeBasicInfoEditDrawer
          employee={employee}
          onClose={() => setShowBasicEdit(false)}
          onSaved={setEmployee}
        />
      )}
    </div>
  );
}
