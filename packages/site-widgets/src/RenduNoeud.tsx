import type { CSSProperties, ReactNode } from "react";

import { CATALOGUE } from "./catalogue";
import { propsPourCible } from "./arbre";
import type { ContexteRendu, Noeud } from "./types";

/** L'aiguilleur récursif. LE composant partagé entre l'éditeur et la page
 *  publique — c'est lui qui rend « ce que je vois est ce qui sera publié »
 *  vrai par construction. */
export function RenduNoeud({
  noeud,
  contexte,
}: {
  noeud: Noeud;
  contexte: ContexteRendu;
}): ReactNode {
  if (!noeud) return null;

  const enfants = noeud.enfants?.length
    ? noeud.enfants.map((enfant) => (
        <RenduNoeud key={enfant.id} noeud={enfant} contexte={contexte} />
      ))
    : null;

  // La racine n'est pas un widget : elle n'a ni réglages ni apparence, elle
  // tient les sections. Lui donner une entrée au catalogue obligerait à
  // inventer un composant qui ne rend rien.
  if (noeud.type === "racine") return <>{enfants}</>;

  const def = CATALOGUE[noeud.type];
  if (!def) {
    // Un type inconnu ne fait PAS tomber la page. Le cas arrive quand un
    // widget est retiré du catalogue alors qu'une page publiée l'utilise
    // encore ; la bonne réponse est de le signaler à l'éditeur, pas de
    // priver le visiteur du reste de la page.
    return contexte.edition ? (
      <div
        data-n={noeud.id}
        style={{
          padding: 16,
          border: "1px dashed #f59e0b",
          background: "#fffbeb",
          color: "#92400e",
          fontSize: 13,
          borderRadius: 8,
        }}
      >
        Composant inconnu : « {noeud.type} »
      </div>
    ) : null;
  }

  const props = propsPourCible(noeud, contexte.cible);
  const style: CSSProperties = def.style ? def.style(props, contexte) : {};

  // Rendu comme un ÉLÉMENT, jamais appelé comme une fonction.
  //
  // Un appel direct marche tant que tous les widgets sont des fonctions
  // ordinaires — et casse net dès qu'un widget a besoin d'état, donc de
  // `"use client"` : son export devient une référence client, un objet, et
  // `def.Rendu(...)` lève « Rendu is not a function » au milieu du rendu
  // serveur. C'est arrivé au premier widget interactif (le bloc Abonnement),
  // et le symptôme — page entière en erreur serveur — ne désignait pas le
  // widget fautif.
  //
  // Le passer par JSX laisse React décider : composant serveur, composant
  // client, peu importe. C'est aussi la seule forme qui autorise les hooks.
  const Composant = def.Rendu;
  // Un widget interactif est un composant CLIENT : on lui passe un contexte
  // sans fonctions. Les laisser ferait échouer la sérialisation de React et
  // rendrait la page entière en erreur serveur.
  const contexteWidget: ContexteRendu = def.interactif
    ? {
        theme: contexte.theme,
        cible: contexte.cible,
        edition: contexte.edition,
        baseMedia: contexte.baseMedia,
        prefixeChemin: contexte.prefixeChemin,
      }
    : contexte;

  return (
    <Composant
      props={props}
      enfants={enfants}
      contexte={contexteWidget}
      noeud={noeud}
      style={style}
      attributs={{ "data-n": noeud.id }}
    />
  );
}
