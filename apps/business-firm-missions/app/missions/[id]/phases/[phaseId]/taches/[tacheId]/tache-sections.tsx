import type { ReactNode } from "react";
import { FolderOpenOutlined, HistoryOutlined, NotesOutlined } from "@mui/icons-material";
import type { TypeTache } from "@/lib/bfm-missions-api";

export interface TacheSection {
  key: string;
  /** Suffixe d'URL sous /missions/[id]/phases/[phaseId]/taches/[tacheId] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
}

/** Les onglets d'une tâche. Un contrôle n'a pas d'onglet à lui — il est un type de tâche, son contenu
 *  est dans l'aperçu — mais ses documents y sont des pièces justificatives. */
export function tacheSections(type: TypeTache): TacheSection[] {
  const controle = type === "CONTROLE";
  return [
    { key: "apercu", path: "", label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} /> },
    {
      key: "documents",
      path: "/documents",
      label: controle ? "Pièces justificatives" : "Documents",
      icon: <FolderOpenOutlined style={{ fontSize: 17 }} />,
    },
    { key: "historique", path: "/historique", label: "Historique", icon: <HistoryOutlined style={{ fontSize: 17 }} /> },
  ];
}

export function tacheSectionForPathname(sections: TacheSection[], pathname: string, base: string): TacheSection {
  const suffix = pathname.replace(base, "").replace(/\/$/, "");
  return sections.find((s) => s.path === suffix) ?? sections[0]!;
}
