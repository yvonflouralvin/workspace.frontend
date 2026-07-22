"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavItem } from "../types/shell";

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href) && item.href !== "/";

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-body-sm font-medium transition-colors ${
                isActive
                  ? "bg-surface-container-low text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              <span
                className={`w-5 h-5 flex-none inline-flex items-center justify-center ${
                  isActive ? "text-primary" : "text-outline"
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="min-w-[18px] px-1.5 rounded-full bg-primary text-on-primary text-[11px] font-semibold leading-[18px] text-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
