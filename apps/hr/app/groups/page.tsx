import { DashboardShell } from "@/components/DashboardShell";
import { GroupFolderView } from "@/components/GroupFolderView";

export default function GroupsPage() {
  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <GroupFolderView />
      </div>
    </DashboardShell>
  );
}
