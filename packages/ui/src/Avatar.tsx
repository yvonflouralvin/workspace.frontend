export type AvatarVariant = "soft" | "solid";

export interface AvatarProps {
  /** Nom complet ou email — les initiales en sont dérivées. */
  name?: string | null;
  /** Initiales explicites, prioritaires sur `name`. */
  initials?: string;
  /** Nombre de lettres dérivées de `name` (1 dans les listes, 2 dans le shell). */
  letters?: 1 | 2;
  size?: number;
  variant?: AvatarVariant;
  /** Couleur d'accent ; par défaut le `primary` du thème. */
  color?: string;
  className?: string;
}

function deriveInitials(name: string, letters: 1 | 2): string {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (letters === 1) return (words[0]?.[0] ?? "?").toUpperCase();
  if (words.length >= 2) return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

export function Avatar({
  name,
  initials,
  letters = 2,
  size = 32,
  variant = "soft",
  color,
  className = "",
}: AvatarProps) {
  const text = initials ?? deriveInitials(name ?? "", letters);
  const accent = color ?? "var(--color-primary)";

  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full font-semibold select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        background: variant === "solid" ? accent : `color-mix(in srgb, ${accent} 10%, transparent)`,
        color: variant === "solid" ? "var(--color-on-primary)" : accent,
      }}
    >
      {text}
    </span>
  );
}
