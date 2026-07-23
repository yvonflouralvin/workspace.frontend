"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { AccessDenied } from "@repo/ui/AccessDenied";
import { ArrowBackOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { AuditTab } from "@/components/emr/AuditTab";
import { getPatient, type Patient } from "@/app/lib/api";

export default function PatientAuditPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const canView = can("hosto.emr.tab.audit");
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (!canView) return;
    getPatient(Number(id)).then(setPatient).catch(() => {});
  }, [id, canView]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center p-6">
          <AccessDenied appName="Historique du dossier" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-on-surface transition-colors flex items-center gap-1">
            <ArrowBackOutlined style={{ fontSize: 16 }} /> Patients
          </Link>
          {patient && (
            <>
              <span className="text-on-surface-variant/40">/</span>
              <Link
                href={`/patients/${id}`}
                className="hover:text-on-surface transition-colors truncate max-w-[200px]"
              >
                {patient.nom} {patient.postnom}
              </Link>
            </>
          )}
          <span className="text-on-surface-variant/40">/</span>
          <span className="text-on-surface">Historique</span>
        </nav>

        <div>
          <h1 className="text-headline-sm font-display text-on-surface">Historique du dossier</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Journal d&apos;audit : toutes les actions liées à ce patient.
          </p>
        </div>

        <AuditTab patientId={Number(id)} />
      </div>
    </DashboardShell>
  );
}
