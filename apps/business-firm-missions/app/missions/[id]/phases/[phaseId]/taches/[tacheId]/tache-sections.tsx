import type { ReactNode } from "react";
import { FolderOpenOutlined, NotesOutlined } from "@mui/icons-material";

export interface TacheSection {
  key: string;
  /** Suffixe d'URL sous /missions/[id]/phases/[phaseId]/taches/[tacheId] — "" pour l'aperçu. */
  path: string;
  label: string;
  icon: ReactNode;
}

export const TACHE_SECTIONS: TacheSection[] = [
  { key: "apercu", path: "", label: "Aperçu", icon: <NotesOutlined style={{ fontSize: 17 }} /> },
  { key: "documents", path: "/documents", label: "Documents", icon: <FolderOpenOutlined style={{ fontSize: 17 }} /> },
];

export function tacheSectionForPathname(
  pathname: string,
  base: string,
): TacheSection {
  const suffix = pathname.replace(base, "").replace(/\/$/, "");
  return TACHE_SECTIONS.find((s) => s.path === suffix) ?? TACHE_SECTIONS[0]!;
}
