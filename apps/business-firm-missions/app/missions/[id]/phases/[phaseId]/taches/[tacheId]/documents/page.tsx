"use client";

import { useMemo } from "react";
import { PanneauDocuments } from "@/components/PanneauDocuments";
import { apiDocumentsTache } from "@/lib/fil-tache-api";
import { useTache } from "../tache-context";

export default function DocumentsTachePage() {
  const { tache } = useTache();
  const api = useMemo(() => apiDocumentsTache("equipe", tache.id), [tache.id]);

  return (
    <PanneauDocuments
      api={api}
      canWrite
      aide={
        tache.assignee_client
          ? "Tous les fichiers de cette tâche : ceux joints à un commentaire et ceux déposés ici. Le client les voit, hors ceux joints à une note interne."
          : "Tous les fichiers de cette tâche : ceux joints à un commentaire et ceux déposés ici. Cette tâche n'est pas assignée au client : seule l'équipe les voit."
      }
    />
  );
}
