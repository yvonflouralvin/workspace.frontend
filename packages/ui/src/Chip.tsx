export type ChipTone =
  | "neutral"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger";

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: "bg-role-member-container text-role-member",
  primary: "bg-role-owner-container text-role-owner",
  info: "bg-role-admin-container text-role-admin",
  success: "bg-member-active-container text-member-active",
  warning: "bg-member-invited-container text-member-invited",
  danger: "bg-error-container text-on-error-container",
};

const SIZE_CLASSES = {
  /** Chips secondaires : groupes, étiquettes de projet. */
  sm: "text-[11px] font-medium px-[7px] py-0.5",
  /** Badges porteurs de sens : rôle, statut. */
  md: "text-label-md font-semibold px-[9px] py-0.5",
};

export interface ChipProps {
  children: React.ReactNode;
  tone?: ChipTone;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function Chip({ children, tone = "neutral", size = "md", className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md whitespace-nowrap ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </span>
  );
}
