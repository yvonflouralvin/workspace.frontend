"use client";

import {
  JALON_STATUT_LABELS,
  JALON_STATUT_TONES,
  echeanceDepassee,
  type Jalon,
} from "@/app/lib/jalons-api";

export function fmtEcheance(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const memeAnnee = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    ...(memeAnnee ? {} : { year: "numeric" }),
  });
}

export function fmtInstant(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StatutJalonPill({ statut }: { statut: string }) {
  const tone = JALON_STATUT_TONES[statut] ?? JALON_STATUT_TONES.a_venir!;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}
    >
      <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
      {JALON_STATUT_LABELS[statut as keyof typeof JALON_STATUT_LABELS] ?? statut}
    </span>
  );
}

/** Ce jalon retient la phase. PASTILLE encadrée — forme distincte du retard, qui
 *  est du texte nu : les deux se superposent souvent et doivent rester lisibles
 *  ensemble. */
export function BloquantPill() {
  return (
    <span className="inline-flex items-center rounded-full border border-error/40 bg-error-container/40 px-2 py-0.5 text-label-md font-semibold text-error">
      Bloquant
    </span>
  );
}

/** Le retard nomme l'ÉCHÉANCE MANQUÉE, pas son ancienneté : c'est la date que
 *  l'utilisateur cherche. Texte seul, sans fond — pas de token d'avertissement
 *  dans le design system, et `locked` a déjà un autre sens. */
export function EcheanceDepassee({ jalon }: { jalon: Jalon }) {
  if (!echeanceDepassee(jalon)) return null;
  return (
    <span className="text-label-md font-medium text-error">
      Échéance dépassée — {fmtEcheance(jalon.date_prevue)}
    </span>
  );
}
