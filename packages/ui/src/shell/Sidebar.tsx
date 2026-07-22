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
    <div className="flex flex-col h-full px-3 py-3.5">
      {topSlot}

      <div className="flex-1 overflow-y-auto mt-3.5 -mx-1 px-1">
        <SidebarNav items={navItems} />

        {secondaryItems && secondaryItems.length > 0 && (
          <>
            <div className="h-px bg-surface-container-low mx-1.5 my-3.5" />
            <SidebarNav items={secondaryItems} />
          </>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-surface-container-low">{bottomSlot}</div>
    </div>
  );
}
