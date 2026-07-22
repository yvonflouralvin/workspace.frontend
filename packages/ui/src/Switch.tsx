"use client";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Libellé accessible quand l'interrupteur n'est pas dans un <label>. */
  label?: string;
}

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 flex-none rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-outline-variant"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface-container-lowest shadow-button transition-[left] ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
