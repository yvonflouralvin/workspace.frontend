"use client";

import { CheckOutlined } from "@mui/icons-material";

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer group">
      <span
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
          checked
            ? "bg-primary border-primary"
            : "border-outline-variant group-hover:border-primary/50"
        }`}
      >
        {checked && <CheckOutlined style={{ fontSize: 14 }} className="text-on-primary" />}
      </span>
      <span className="flex flex-col">
        <span className="text-sm text-on-surface">{label}</span>
        {description && (
          <span className="text-xs text-on-surface-variant">{description}</span>
        )}
      </span>
    </label>
  );
}
