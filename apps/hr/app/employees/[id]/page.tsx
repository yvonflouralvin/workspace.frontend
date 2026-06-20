import { DashboardShell } from "@/components/DashboardShell";
import { EmployeeDetailView } from "@/components/EmployeeDetailView";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <EmployeeDetailView employeeId={Number(id)} />
      </div>
    </DashboardShell>
  );
}
