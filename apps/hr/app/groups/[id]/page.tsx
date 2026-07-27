import { DashboardShell } from "@/components/DashboardShell";
import { GroupFolderView } from "@/components/GroupFolderView";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <GroupFolderView groupId={Number(id)} />
      </div>
    </DashboardShell>
  );
}
