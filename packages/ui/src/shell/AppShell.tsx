import { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, topBar, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className="flex-shrink-0 flex flex-col border-r border-outline-variant bg-surface-container-lowest"
        style={{ width: "260px" }}
      >
        {sidebar}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex-shrink-0 flex items-center border-b border-outline-variant bg-surface-container-lowest" style={{ height: "56px" }}>
          {topBar}
        </header>
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
