"use client";

import { useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { MultiSelect } from "@repo/ui/MultiSelect";
import type { SettingDef } from "@/app/lib/types";

const FIELD =
  "w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

/**
 * Éditeur des types qui ne tiennent pas en ligne (`text`, `date`, `multi_choice`).
 * Le drawer n'écrit pas au serveur : il rend la valeur au panneau, qui l'ajoute
 * aux modifications en attente — la barre « non enregistrées » commet le tout.
 */
export function SettingValueDrawer({
  setting,
  value: initialValue,
  onApply,
  onClose,
}: {
  setting: SettingDef;
  value: unknown;
  onApply: (value: unknown) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<unknown>(initialValue);

  return (
    <RightDrawer
      title={setting.name}
      onClose={onClose}
      width="md:w-[400px] md:max-w-[92vw]"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-[34px] px-3.5 rounded-lg border border-outline-soft text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onApply(value ?? null)}
            className="ml-auto h-[34px] px-4 rounded-lg bg-primary text-on-primary text-label-md font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            Appliquer
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {setting.description && (
          <p className="text-body-sm text-on-surface-variant">{setting.description}</p>
        )}

        {setting.type === "text" && (
          <input
            type="text"
            autoFocus
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(e.target.value)}
            className={FIELD}
          />
        )}

        {setting.type === "date" && (
          <input
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(e.target.value)}
            className={FIELD}
          />
        )}

        {setting.type === "single_choice" && (
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(e.target.value || null)}
            className={FIELD}
          >
            <option value="">—</option>
            {(setting.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {setting.type === "multi_choice" && (
          <MultiSelect
            options={(setting.options ?? []).map((o) => ({ id: o.value, label: o.label }))}
            selectedIds={Array.isArray(value) ? (value as string[]) : []}
            onChange={setValue}
          />
        )}

        <p className="text-label-md text-outline">
          La modification n&apos;est appliquée qu&apos;après « Enregistrer » dans le panneau.
        </p>
      </div>
    </RightDrawer>
  );
}
