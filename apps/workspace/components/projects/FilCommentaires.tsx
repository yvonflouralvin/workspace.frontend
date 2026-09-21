"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@repo/auth/store/session.store";
import { FilCommentaires as FilPartage, type ApiFil } from "@repo/ui/FilCommentaires";
import type { Personne } from "@repo/ui/ZoneCommentaire";
import { listMembers } from "@/app/lib/api";
import { projectsApi, type Commentaire } from "@/app/lib/projects-api";

/** Le fil d'une tâche de Projets.
 *
 *  Le composant vit dans @repo/ui, partagé avec le module Missions. Ici, seulement ce qui est
 *  propre à Projets : où lire et écrire, et qui l'on peut nommer.
 *
 *  Il se lit et s'écrit PAR LA TÂCHE, jamais par son projet — c'est la seule forme qui vaut
 *  aussi pour une tâche du bac du workspace, dont le projet ne s'ouvre pas.
 */
export function FilCommentaires({ taskId, canWrite }: { taskId: number; canWrite: boolean }) {
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const [membres, setMembres] = useState<Personne[]>([]);

  useEffect(() => {
    if (!workspaceId) return;
    listMembers(Number(workspaceId), { limit: 200 })
      .then((r) => setMembres(r.members.map((m) => ({ id: m.user.id, nom: m.user.username }))))
      .catch(() => {});
  }, [workspaceId]);

  const api = useMemo<ApiFil<Commentaire>>(
    () => ({
      lister: (limite) => projectsApi.listComments(taskId, limite),
      publier: async (texte, fichier, options) => {
        const envoi = {
          parent_comment_id: options.parent_comment_id,
          mention_user_ids: options.mention_user_ids,
        };
        if (fichier) await projectsApi.createCommentFile(taskId, fichier, texte || null, envoi);
        else await projectsApi.createComment(taskId, texte, envoi);
      },
      modifier: (id, texte) => projectsApi.updateComment(id, texte),
      supprimer: (id) => projectsApi.deleteComment(id),
      urlPiece: (commentaire, piece) => projectsApi.attachmentUrl(commentaire.id, piece.id),
    }),
    [taskId]
  );

  return <FilPartage api={api} membres={membres} canWrite={canWrite} />;
}
