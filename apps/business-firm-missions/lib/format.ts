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

/** Une date-heure du serveur — en UTC, sans fuseau écrit : `new Date` la lirait en heure locale. */
export function dateHeureFr(iso: string): string {
  const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  return new Date(utc).toLocaleString("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** « 12/10/2026 » — la date telle qu'on l'écrit dans une colonne. */
export function jourFr(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}
