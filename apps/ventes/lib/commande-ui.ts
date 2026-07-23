import type { StatutCommande } from "@/lib/ventes-api";

export const STATUTS: { value: StatutCommande; label: string }[] = [
  { value: "BROUILLON", label: "Brouillon" },
  { value: "VALIDEE", label: "Validé" },
  { value: "PARTIELLE", label: "Paiement partiel" },
  { value: "PAYEE", label: "Payé" },
  { value: "ANNULEE", label: "Annulé" },
];

export const STATUT_LABEL: Record<StatutCommande, string> = {
  BROUILLON: "Brouillon",
  VALIDEE: "Validé",
  PARTIELLE: "Paiement partiel",
  PAYEE: "Payé",
  ANNULEE: "Annulé",
};

export const STATUT_CLASS: Record<StatutCommande, string> = {
  BROUILLON: "bg-role-member-container text-role-member",
  VALIDEE: "bg-role-admin-container text-role-admin",
  PARTIELLE: "bg-role-owner-container text-role-owner",
  PAYEE: "bg-member-active-container text-member-active",
  ANNULEE: "bg-error-container text-on-error-container",
};

/** Couleurs de tracé pour les graphiques — mêmes teintes que les pastilles. */
export const STATUT_CHART_COLOR: Record<StatutCommande, string> = {
  BROUILLON: "var(--color-outline-variant)",
  VALIDEE: "var(--color-tertiary)",
  PARTIELLE: "var(--color-primary)",
  PAYEE: "var(--color-secondary)",
  ANNULEE: "var(--color-error)",
};

export function formatMontant(v: string | number | null, devise?: string): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  const s = n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return devise ? `${s} ${devise}` : s;
}

export function formatQuantite(v: string | number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export const MODES_PAIEMENT: { value: string; label: string }[] = [
  { value: "ESPECES", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARTE", label: "Carte bancaire" },
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE", label: "Chèque" },
];

export const MODE_LABEL: Record<string, string> = Object.fromEntries(
  MODES_PAIEMENT.map((m) => [m.value, m.label]),
);
