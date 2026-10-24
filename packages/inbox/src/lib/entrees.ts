/** La file unique : fils et notifications mêlés, du plus récent au plus ancien.
 *
 *  Extrait du composant pour être éprouvé seul — l'ordre EST la
 *  fonctionnalité. La question de tous les matins n'est pas « qu'est-ce
 *  qu'on m'a écrit » mais « qu'est-ce qui m'attend », et deux sources rangées
 *  séparément n'y répondent pas.
 */
import type { InAppNotification } from "@repo/notifications/types/notification";
import type { Fil } from "../types";

export type Entree =
  | { sorte: "fil"; date: string; fil: Fil }
  | { sorte: "notification"; date: string; notification: InAppNotification };

export function melanger(fils: Fil[], notifications: InAppNotification[]): Entree[] {
  const tout: Entree[] = [
    ...fils.map((fil) => ({ sorte: "fil" as const, date: fil.dernier_message_le, fil })),
    ...notifications.map((notification) => ({
      sorte: "notification" as const,
      date: notification.created_at,
      notification,
    })),
  ];
  // Comparaison de CHAÎNES, pas de dates : les deux sources rendent de l'ISO
  // 8601, qui se trie lexicographiquement. Construire deux objets Date par
  // comparaison coûterait pour rien sur une liste qu'on retrie à chaque
  // rafraîchissement.
  return tout.sort((a, b) => b.date.localeCompare(a.date));
}

export function cleDe(entree: Entree): string {
  return entree.sorte === "fil"
    ? `fil-${entree.fil.id}`
    : `notification-${entree.notification.id}`;
}

export function estNonLue(entree: Entree): boolean {
  return entree.sorte === "fil" ? entree.fil.non_lu : entree.notification.read_at === null;
}

/** Depuis combien de temps, en une poignée de caractères : la colonne de
 *  droite d'une liste n'a pas la place d'une date complète. */
export function depuis(iso: string, maintenant: number = Date.now()): string {
  const ecart = Math.max(0, maintenant - new Date(iso).getTime());
  const min = Math.floor(ecart / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const j = Math.floor(h / 24);
  if (j < 7) return `${j} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
