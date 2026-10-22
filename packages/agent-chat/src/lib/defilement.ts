/** Garder un fil de discussion collé au bas — sans jamais ramener en bas
 *  quelqu'un qui est remonté lire.
 *
 *  Le piège, et la raison de ce module : mesurer la distance au bas APRÈS que le
 *  contenu a changé ne dit pas ce qu'on croit. Elle vaut alors la hauteur de ce
 *  qui vient d'arriver, et un message long, un gros morceau de flux ou
 *  l'ouverture d'un historique dépassent d'un coup n'importe quel seuil : le
 *  code concluait « il a remonté », et le fil restait bloqué en haut pour tout
 *  le reste de la conversation. L'intention de l'utilisateur ne peut venir que
 *  d'un ÉVÈNEMENT de défilement, jamais d'une mesure prise après coup. */

/** Sous cette distance du bas, le fil est tenu pour collé. Il en faut une : un
 *  défilement fluide s'arrête rarement au pixel près. */
export const SEUIL_BAS = 120;

/** Ce qu'on lit d'un élément défilant — un `HTMLElement` en est un. */
export interface Fil {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}

export interface Colleur {
  /** Le fil suit-il le bas ? */
  readonly colle: boolean;
  /** Un évènement de défilement est arrivé : la seule source d'intention. */
  defile(fil: Fil): void;
  /** Le contenu a changé : suivre le bas, mais seulement si on y était. */
  suivre(fil: Fil): void;
  /** Revenir au présent : à l'envoi d'un message, à l'ouverture d'un fil. */
  recoller(fil: Fil): void;
}

export function creerColleur(seuil = SEUIL_BAS): Colleur {
  let colle = true;
  const auBas = (fil: Fil) => fil.scrollHeight - fil.scrollTop - fil.clientHeight < seuil;
  return {
    get colle() {
      return colle;
    },
    defile(fil) {
      colle = auBas(fil);
    },
    suivre(fil) {
      if (colle) fil.scrollTop = fil.scrollHeight;
    },
    recoller(fil) {
      colle = true;
      fil.scrollTop = fil.scrollHeight;
    },
  };
}
