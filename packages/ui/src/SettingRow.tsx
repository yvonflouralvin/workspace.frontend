"use client";

import { EditOutlined } from "@mui/icons-material";
import { Chip } from "./Chip";
import { Switch } from "./Switch";

export type SettingRowType = "text" | "date" | "single_choice" | "multi_choice" | "toggle";

/**
 * `unset` = aucune valeur ; `default` = valeur encore à la valeur d'usine ;
 * `critical` = paramètre sensible ; `ok` = configuré, aucun ornement.
 */
export type SettingRowState = "ok" | "default" | "critical" | "unset";

export interface SettingRowOption {
  value: string;
  label: string;
}

export interface SettingRowProps {
  name: string;
  description?: string | null;
  type: SettingRowType;
  /** Valeur brute — utilisée par les contrôles en ligne (toggle, choix simple). */
  value?: unknown;
  /** Valeur déjà formatée, affichée pour les types qui passent par un drawer. */
  displayValue?: string;
  options?: SettingRowOption[] | null;
  state?: SettingRowState;
  disabled?: boolean;
  /** Édition en ligne — `toggle` et `single_choice`. */
  onChange?: (value: unknown) => void;
  /** Ouverture du drawer — `text`, `date`, `multi_choice`. */
  onEdit?: () => void;
}

const INLINE_TYPES: SettingRowType[] = ["toggle", "single_choice"];

export function isInlineSetting(type: SettingRowType): boolean {
  return INLINE_TYPES.includes(type);
}

export function SettingRow({
  name,
  description,
  type,
  value,
  displayValue,
  options,
  state = "ok",
  disabled,
  onChange,
  onEdit,
}: SettingRowProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-hairline last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-md font-medium text-on-surface">{name}</span>
          <StateTag state={state} />
        </div>
        {description && (
          <p className="text-label-md text-outline mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex-none">
        {type === "toggle" ? (
          <Switch
            checked={Boolean(value)}
            disabled={disabled}
            label={name}
            onChange={(next) => onChange?.(next)}
          />
        ) : type === "single_choice" ? (
          <select
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value || null)}
            className="h-[34px] px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
          >
            <option value="">—</option>
            {(options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={`text-body-md ${
                state === "unset" ? "text-status-backlog italic" : "text-on-surface-variant"
              }`}
            >
              {displayValue ?? "—"}
            </span>
            <button
              type="button"
              onClick={onEdit}
              disabled={disabled}
              title="Modifier"
              aria-label={`Modifier ${name}`}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-md border border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:opacity-50 transition-colors"
            >
              <EditOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StateTag({ state }: { state: SettingRowState }) {
  if (state === "critical") return <Chip tone="danger">Critique</Chip>;
  if (state === "default") return <Chip>Défaut</Chip>;
  if (state === "unset") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-member-invited">
        <span className="w-1.5 h-1.5 rounded-full bg-member-invited" />
        Non configuré
      </span>
    );
  }
  return null;
}
