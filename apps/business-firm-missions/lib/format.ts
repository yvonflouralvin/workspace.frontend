export function dateFr(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Une échéance dépassée compte, sauf si la tâche est déjà faite. */
export function enRetard(echeance: string | null, terminee: boolean): boolean {
  if (!echeance || terminee) return false;
  const fin = new Date(echeance);
  fin.setHours(23, 59, 59, 999);
  return fin.getTime() < Date.now();
}

/** « 12 oct. » — pour une carte où la place manque. */
export function dateCourte(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
