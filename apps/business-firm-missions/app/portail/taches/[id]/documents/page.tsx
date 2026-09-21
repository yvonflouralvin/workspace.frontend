"use client";

import { useEffect, useMemo, useState } from "react";
import { PanneauDocuments } from "@/components/PanneauDocuments";
import { apiDocumentsTache, listMentionnablesPortail } from "@/lib/fil-tache-api";
import { usePortailTache } from "../tache-context";

export default function DocumentsTachePortailPage() {
  const { tache } = usePortailTache();
  const api = useMemo(() => apiDocumentsTache("portail", tache.id), [tache.id]);
  // Le client ne peut nommer que l'équipe de la mission — le serveur le rappelle, on ne propose que ça.
  const [equipe, setEquipe] = useState<{ id: number; nom: string }[]>([]);
  useEffect(() => {
    listMentionnablesPortail(tache.id).then(setEquipe).catch(() => setEquipe([]));
  }, [tache.id]);

  return (
    <PanneauDocuments
      api={api}
      audience="portail"
      membres={equipe}
      canWrite
      aide="Déposez ici les documents demandés. Business Firm les reçoit immédiatement. Vous pouvez les renommer, et discuter de chacun avec l'équipe."
    />
  );
}
