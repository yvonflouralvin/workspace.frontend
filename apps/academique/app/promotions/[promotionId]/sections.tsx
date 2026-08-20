import type { ReactNode } from "react";
import {
  AssignmentTurnedInOutlined,
  EditNoteOutlined,
  EventAvailableOutlined,
  GavelOutlined,
  MenuBookOutlined,
  NotesOutlined,
  PaymentsOutlined,
  ScheduleOutlined,
  ScienceOutlined,
  TuneOutlined,
} from "@mui/icons-material";

export interface Section {
  cle: string;
  /** Suffixe d'URL sous /promotions/[id] — "" pour l'aperçu. */
  chemin: string;
  libelle: string;
  icone: ReactNode;
  /** Permission qui ouvre l'onglet. Absente : toujours visible. */
  permission?: string;
}

/** Les onglets d'une promotion.
 *
 *  **Aucun onglet n'est masqué par une condition de DONNÉES.** C'est la leçon
 *  du défaut #9 du module projets : deux règles de visibilité justes, qui se
 *  croisaient, rendaient un écran inatteignable sur un objet neuf. Ici seuls
 *  les droits décident ; un onglet vide dit qu'il est vide.
 */
export const SECTIONS: Section[] = [
  { cle: "apercu", chemin: "", libelle: "Classe", icone: <NotesOutlined style={{ fontSize: 17 }} /> },
  {
    cle: "programme",
    chemin: "/programme",
    libelle: "Programme",
    icone: <MenuBookOutlined style={{ fontSize: 17 }} />,
    permission: "academique.programme.view",
  },
  {
    cle: "cotation",
    chemin: "/cotation",
    libelle: "Cotation",
    icone: <EditNoteOutlined style={{ fontSize: 17 }} />,
    permission: "academique.programme.view",
  },
  {
    cle: "examens",
    chemin: "/examens",
    libelle: "Examens",
    icone: <EventAvailableOutlined style={{ fontSize: 17 }} />,
    permission: "academique.programme.view",
  },
  {
    cle: "horaire",
    chemin: "/horaire",
    libelle: "Horaire",
    icone: <ScheduleOutlined style={{ fontSize: 17 }} />,
    permission: "academique.programme.view",
  },
  {
    cle: "deliberation",
    chemin: "/deliberation",
    libelle: "Délibération",
    icone: <GavelOutlined style={{ fontSize: 17 }} />,
    permission: "academique.deliberation.view",
  },
  {
    cle: "recours",
    chemin: "/recours",
    libelle: "Recours",
    icone: <AssignmentTurnedInOutlined style={{ fontSize: 17 }} />,
    permission: "academique.programme.view",
  },
  {
    cle: "frais",
    chemin: "/frais",
    libelle: "Frais",
    icone: <PaymentsOutlined style={{ fontSize: 17 }} />,
    permission: "academique.structure.view",
  },
  {
    cle: "recherche",
    chemin: "/recherche",
    libelle: "Projets & défenses",
    icone: <ScienceOutlined style={{ fontSize: 17 }} />,
    permission: "academique.structure.view",
  },
  {
    cle: "vannes",
    chemin: "/vannes",
    libelle: "Vannes",
    icone: <TuneOutlined style={{ fontSize: 17 }} />,
    permission: "academique.structure.view",
  },
];

export function sectionPour(pathname: string, promotionId: number): Section {
  const suffixe = pathname.replace(`/promotions/${promotionId}`, "").replace(/\/$/, "");
  return (
    SECTIONS.find((s) => s.chemin === suffixe) ??
    SECTIONS.find((s) => s.chemin && suffixe.startsWith(`${s.chemin}/`)) ??
    SECTIONS[0]!
  );
}
