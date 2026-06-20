"use client";

import { ReactNode, useState } from "react";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, defaultTab }: { tabs: TabItem[]; defaultTab?: string }) {
  const [activeKey, setActiveKey] = useState(defaultTab ?? tabs[0]?.key);
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-outline-variant">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveKey(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab.key === active?.key
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{active?.content}</div>
    </div>
  );
}
