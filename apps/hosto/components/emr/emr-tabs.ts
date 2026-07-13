// Source unique des onglets du dossier médical électronique — consommée par la page EMR
// (`app/patients/[id]/emr/page.tsx`) ET le panneau dédoublé (`EMRPanel.tsx`), pour que la
// liste des onglets ET le mapping des permissions ne vivent qu'à un seul endroit.

export type EMRTabKey =
  | "summary"
  | "history"
  | "allergies"
  | "conditions"
  | "observations"
  | "notes"
  | "medications"
  | "prescriptions"
  | "examens"
  | "actes"
  | "hospitalisations"
  | "timeline"
  | "audit";

export interface EMRTabMeta {
  key: EMRTabKey;
  label: string;
  // Droit requis pour voir l'onglet. Absent = visible dès que le dossier est ouvrable —
  // la page EMR est déjà gardée en amont par `hosto.emr.view`, donc « Résumé » reste
  // toujours présent et sert de repli sûr quand l'onglet demandé n'est pas autorisé.
  permission?: string;
}

export const EMR_TABS: EMRTabMeta[] = [
  { key: "summary",          label: "Résumé" },
  { key: "history",          label: "Antécédents",      permission: "hosto.emr.tab.history" },
  { key: "allergies",        label: "Allergies",        permission: "hosto.emr.tab.allergies" },
  { key: "conditions",       label: "Problèmes",        permission: "hosto.emr.tab.conditions" },
  { key: "observations",     label: "Constantes",       permission: "hosto.emr.tab.vitals" },
  { key: "notes",            label: "Notes",            permission: "hosto.emr.tab.notes" },
  { key: "medications",      label: "Traitements",      permission: "hosto.emr.tab.medications" },
  { key: "prescriptions",    label: "Prescriptions",    permission: "hosto.prescriptions.view" },
  { key: "examens",          label: "Examens",          permission: "hosto.emr.tab.examens" },
  { key: "actes",            label: "Actes",            permission: "hosto.actes.view" },
  { key: "hospitalisations", label: "Hospitalisations", permission: "hosto.admissions.view" },
  { key: "timeline",         label: "Timeline",         permission: "hosto.emr.tab.timeline" },
  { key: "audit",            label: "Historique",       permission: "hosto.emr.tab.audit" },
];

// Filtre les onglets par permission. `only` restreint au sous-ensemble d'onglets qu'un
// renderer sait afficher (ex. EMRPanel ne rend pas « Hospitalisations »).
export function visibleEmrTabs(
  can: (permission: string) => boolean,
  only?: readonly EMRTabKey[],
): EMRTabMeta[] {
  const pool = only ? EMR_TABS.filter((t) => only.includes(t.key)) : EMR_TABS;
  return pool.filter((t) => !t.permission || can(t.permission));
}
