"use client";

import { ReactNode, useState } from "react";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

/** Des onglets, éventuellement CONTRÔLÉS.
 *
 *  Par défaut ils gardent l'onglet actif pour eux, ce qui suffit à la plupart
 *  des écrans. Passer `activeTab` + `onChange` le remonte à l'appelant : c'est
 *  ce qu'il faut quand chaque onglet charge ses propres données et qu'on ne veut
 *  pas les charger toutes à l'ouverture de la page.
 */
export function Tabs({
  tabs,
  defaultTab,
  activeTab,
  onChange,
}: {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (key: string) => void;
}) {
  const [interne, setInterne] = useState(defaultTab ?? tabs[0]?.key);
  const courant = activeTab ?? interne;
  const active = tabs.find((tab) => tab.key === courant) ?? tabs[0];

  function choisir(key: string) {
    if (activeTab === undefined) setInterne(key);
    onChange?.(key);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => choisir(tab.key)}
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
