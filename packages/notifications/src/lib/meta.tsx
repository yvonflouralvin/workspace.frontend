import {
  BiotechOutlined,
  NotificationsOutlined,
  ScienceOutlined,
} from "@mui/icons-material";

// Métadonnées de présentation par type de notification (icône + libellé de catégorie).
const TYPE_META: Record<string, { label: string; Icon: typeof NotificationsOutlined }> = {
  "hosto.lab.request.created": { label: "Demande d'examen", Icon: ScienceOutlined },
  "hosto.lab.result.validated": { label: "Résultats d'examen", Icon: BiotechOutlined },
};

export function typeLabel(typeKey: string): string {
  return TYPE_META[typeKey]?.label ?? "Notification";
}

export function typeIcon(typeKey: string, size = 18) {
  const Icon = TYPE_META[typeKey]?.Icon ?? NotificationsOutlined;
  return <Icon style={{ fontSize: size }} />;
}

// Champs du payload `data` affichés dans le détail, avec leur libellé FR.
export const FIELD_LABELS: Record<string, string> = {
  patient_name: "Patient",
  exams: "Examens",
  priority: "Priorité",
  clinical_info: "Renseignement clinique",
  conclusion: "Conclusion",
};

export function formatFieldValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
