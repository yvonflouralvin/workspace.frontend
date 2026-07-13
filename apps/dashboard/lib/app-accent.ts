import { PLATFORM_APPS } from "@repo/ui/shell/platform";

// Couleur d'accent d'un provider = couleur de son app dans le registre plateforme.
export function accentFor(provider: string): string {
  return PLATFORM_APPS.find((a) => a.id === provider)?.color ?? "var(--color-primary)";
}
