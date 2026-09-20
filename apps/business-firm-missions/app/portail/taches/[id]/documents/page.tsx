"use client";

import { useMemo } from "react";
import { PanneauDocuments } from "@/components/PanneauDocuments";
import { apiDocumentsTache } from "@/lib/fil-tache-api";
import { usePortailTache } from "../tache-context";

export default function DocumentsTachePortailPage() {
  const { tache } = usePortailTache();
  const api = useMemo(() => apiDocumentsTache("portail", tache.id), [tache.id]);

  return (
    <PanneauDocuments
      api={api}
      canWrite
      aide="Déposez ici les documents demandés. Business Firm les reçoit immédiatement. Vous retrouvez aussi ceux joints à la discussion."
    />
  );
}
