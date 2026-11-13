"use client";

import { LockOutlined } from "@mui/icons-material";

/** Ce qu'on affiche quand le droit manque, au lieu d'un écran vide ou du « Forbidden »
 *  que renvoie le service. Il NOMME la permission : la personne ne se la donnera pas
 *  elle-même, elle va la demander à l'administrateur du workspace, et « je n'ai pas le
 *  droit » sans le nom du droit fait un aller-retour de plus. */
export function DroitManquant({ droit, quoi }: { droit: string; quoi: string }) {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-6 flex gap-3">
      <LockOutlined className="text-outline shrink-0" style={{ fontSize: 20 }} />
      <div className="space-y-1">
        <p className="text-body-md text-on-surface font-semibold">{quoi}</p>
        <p className="text-body-sm text-on-surface-variant">
          Il vous manque la permission <span className="font-mono text-on-surface">{droit}</span>.
          Demandez à l&rsquo;administrateur de votre espace de travail de vous ranger dans un
          groupe qui la porte — « Équipe BFM » la porte.
        </p>
      </div>
    </div>
  );
}
