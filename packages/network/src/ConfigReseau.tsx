"use client";

import type { ReactNode } from "react";
import { configurerReseauClient } from "./config.js";

type Props = {
  mode?: string;
  cle?: string;
  children?: ReactNode;
};

/** Dépose la configuration réseau lue par le SERVEUR dans l'environnement du
 *  conteneur, pour que le navigateur n'ait pas à la trouver dans son bundle.
 *
 *  À monter dans le layout racine, AUTOUR des enfants :
 *
 *      <ConfigReseau
 *        mode={process.env.NETWORK_ENCRYPTION}
 *        cle={process.env.NETWORK_ENCRYPTION_KEY}
 *      >
 *        {children}
 *      </ConfigReseau>
 *
 *  POURQUOI DÉPOSER PENDANT LE RENDU ET NON DANS UN EFFET : le corps d'un
 *  composant parent s'exécute avant celui de ses enfants, donc avant tout
 *  `apiFetch` qu'un enfant déclencherait à son montage. Un `useEffect`, lui,
 *  passerait APRÈS ceux des enfants — et le premier appel chiffré partirait
 *  sans clé. C'est la même raison qui impose d'envelopper les enfants plutôt
 *  que d'être rendu à côté d'eux.
 *
 *  Le dépôt est idempotent, ce qui le rend sans conséquence sur un double rendu
 *  (mode strict) comme sur le rendu serveur — où la valeur déposée est de toute
 *  façon celle de l'environnement du conteneur, constante pour sa durée de vie. */
export function ConfigReseau({ mode, cle, children }: Props) {
  configurerReseauClient({ mode, cle });
  return <>{children}</>;
}
