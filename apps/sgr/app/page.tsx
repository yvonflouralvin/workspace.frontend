"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

/** Chacun chez soi.
 *
 *  Un candidat n'a rien à faire dans la file d'instruction, et un agent n'a pas
 *  de dossier à déposer : la racine envoie chacun là où son travail commence,
 *  plutôt que d'afficher un menu où l'un des deux se trompe.
 */
export default function Racine() {
  const router = useRouter();
  const { can } = usePermissions();
  // On attend la session : décider sur une liste de droits encore vide
  // enverrait tout le monde chez le candidat.
  const chargement = useSessionStore((s) => s.loading);

  useEffect(() => {
    if (chargement) return;
    router.replace(can("sgr.dossiers.view") ? "/dossiers" : "/mon-dossier");
  }, [chargement, can, router]);

  return null;
}
