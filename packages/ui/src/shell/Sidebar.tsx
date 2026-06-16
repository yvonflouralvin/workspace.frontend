import { ReactNode } from "react";
import { NavItem } from "../types/shell";
import { SidebarNav } from "./SidebarNav";

interface SidebarProps {
  topSlot?: ReactNode;
  navItems: NavItem[];
  secondaryItems?: NavItem[];
  bottomSlot: ReactNode;
}

export function Sidebar({ topSlot, navItems, secondaryItems, bottomSlot }: SidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {topSlot && (
        <div className="px-3 pt-3 pb-2 border-b border-outline-variant">
          {topSlot}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        <SidebarNav items={navItems} />

        {secondaryItems && secondaryItems.length > 0 && (
          <>
            <div className="my-3 border-t border-outline-variant" />
            <SidebarNav items={secondaryItems} />
          </>
        )}
      </nav>

      <div className="border-t border-outline-variant px-3 py-3">
        {bottomSlot}
      </div>
    </div>
  );
}
