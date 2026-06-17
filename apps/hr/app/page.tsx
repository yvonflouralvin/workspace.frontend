"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";

interface Department {
  id: number;
  name: string;
  headcount: number;
}

export default function HomePage() {
  const { can } = usePermissions();
  const canView = can("hr.departments.view");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    fetch("/api/departments")
      .then(async (res) => {
        if (!res.ok) throw new Error("Erreur de chargement");
        return res.json();
      })
      .then((data) => setDepartments(data.departments))
      .catch(() => setError("Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [canView]);

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Départements</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Module RH — simulation du registre RBAC multi-application.
          </p>
        </div>

        {!canView && (
          <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
            Accès restreint à cette section.
          </p>
        )}

        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {canView && loading && (
          <p className="text-sm text-on-surface-variant">Chargement…</p>
        )}

        {canView && !loading && !error && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  <th className="px-5 py-3 font-medium">Département</th>
                  <th className="px-5 py-3 font-medium">Effectif</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-5 py-3 text-on-surface">{d.name}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{d.headcount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
