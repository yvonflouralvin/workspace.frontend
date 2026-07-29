"use client";

import { CloseOutlined } from "@mui/icons-material";
import type { EchecSauvegarde } from "@/app/lib/autosave";
import { MotifsBlocage } from "./MotifsBlocage";

/** Ce qui a empêché l'enregistrement, dit à l'utilisateur.
 *
 *  Un verrou de gouvernance nomme et LIE ce qui bloque ; les autres refus n'ont
 *  qu'une phrase, mais une phrase vaut infiniment mieux que l'indicateur muet
 *  qu'affichaient ces écrans. */
export function EchecAutosave({
  echec,
  projectId,
  onFermer,
}: {
  echec: EchecSauvegarde;
  projectId: number;
  onFermer: () => void;
}) {
  if (echec.refus) {
    return <MotifsBlocage refus={echec.refus} projectId={projectId} />;
  }

  const texte = echec.wip
    ? `« ${echec.wip.etat} » est à sa limite : ${echec.wip.effectif} élément${
        echec.wip.effectif > 1 ? "s" : ""
      } pour une limite de ${echec.wip.limite}. Terminez-en un avant d'en commencer un autre.`
    : echec.message;

  return (
    <div className="flex items-start gap-2 rounded-lg bg-error-container/40 px-3 py-2">
      <p className="flex-1 text-body-sm text-error">{texte}</p>
      <button
        type="button"
        onClick={onFermer}
        aria-label="Masquer le message"
        className="flex-none text-error/70 hover:text-error transition-colors"
      >
        <CloseOutlined style={{ fontSize: 15 }} />
      </button>
    </div>
  );
}
