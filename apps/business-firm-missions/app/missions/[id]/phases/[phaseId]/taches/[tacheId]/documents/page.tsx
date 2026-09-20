"use client";

import { useMemo } from "react";
import { PanneauDocuments } from "@/components/PanneauDocuments";
import { apiDocumentsTache } from "@/lib/fil-tache-api";
import { useMission } from "../../../../../mission-context";
import { useTache } from "../tache-context";

export default function DocumentsTachePage() {
  const { tache } = useTache();
  const { membres } = useMission();
  const api = useMemo(() => apiDocumentsTache("equipe", tache.id), [tache.id]);
  const personnes = useMemo(() => membres.map((m) => ({ id: m.id, nom: m.name })), [membres]);

  return (
    <PanneauDocuments
      api={api}
      audience="equipe"
      membres={personnes}
      optionInterne
      canWrite
      aide={
        tache.assignee_client
          ? "Tous les fichiers de cette tâche : ceux joints à un commentaire et ceux déposés ici. Le client les voit, hors ceux joints à une note interne."
          : "Tous les fichiers de cette tâche : ceux joints à un commentaire et ceux déposés ici. Cette tâche n'est pas assignée au client : seule l'équipe les voit."
      }
    />
  );
}
