import { DashboardShell } from "@/components/DashboardShell";
import { GroupFolderView } from "@/components/GroupFolderView";

export default function GroupsPage() {
  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Groupes / Départements</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Organisez les employés en dossiers — créez des sous-groupes et naviguez-y.
          </p>
        </div>

        <GroupFolderView />
      </div>
    </DashboardShell>
  );
}
