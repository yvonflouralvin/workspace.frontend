"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

/** Chacun là où son travail commence.
 *
 *  Le secrétariat ouvre sur le registre — c'est là qu'il passe ses journées ;
 *  la direction, sur la structure. Une page d'accueil neutre aurait obligé
 *  les deux à un clic de plus, à chaque fois.
 */
export default function Racine() {
  const router = useRouter();
  const { can } = usePermissions();
  const chargement = useSessionStore((s) => s.loading);

  useEffect(() => {
    if (chargement) return;
    router.replace(can("academique.etudiants.view") ? "/etudiants" : "/structure");
  }, [chargement, can, router]);

  return null;
}
