import { produits } from "../lib/produits";
import { Reveal } from "./Reveal";

/** LES CHIFFRES QUI TIENNENT.
 *
 *  Un site de logiciel affiche en général « 99,9 % de disponibilité » et
 *  « +500 clients » — deux chiffres qu'aucun visiteur ne peut vérifier et que
 *  nous ne pourrions pas tenir. Ceux-ci sont vrais et vérifiables en
 *  quelques clics dans le produit, ce qui est exactement ce qu'on cherche :
 *  la confiance vient de la précision, pas de la grandeur.
 *
 *  Le nombre de modules est COMPTÉ, pas écrit : il est faux le jour où l'on
 *  en ajoute un, et personne ne penserait à le corriger ici.
 */
const CHIFFRES = [
  {
    valeur: String(produits.length),
    unite: "",
    libelle: "modules",
    detail: "Activés à la demande, un par un",
  },
  {
    valeur: "1",
    unite: "",
    libelle: "socle commun",
    detail: "Mêmes membres, mêmes droits, mêmes clients",
  },
  {
    valeur: "160",
    unite: "+",
    libelle: "actions automatisables",
    detail: "Ce que vos collaborateurs virtuels savent déclencher",
  },
  {
    valeur: "2",
    unite: "",
    libelle: "façons d'héberger",
    detail: "Chez nous, ou sur vos propres serveurs",
  },
] as const;

export function Chiffres({ sombre = false }: { sombre?: boolean }) {
  return (
    <dl className="grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
      {CHIFFRES.map((c, i) => (
        <Reveal key={c.libelle} delai={i * 90}>
          <div
            className={`border-l-2 pl-md ${
              sombre ? "border-[color:var(--halo-indigo)]" : "border-primary/30"
            }`}
          >
            <dd
              className={`font-display text-[2.25rem] leading-none font-bold tracking-[-0.03em] ${
                sombre ? "text-[color:var(--nuit-texte)]" : "text-on-surface"
              }`}
            >
              {c.valeur}
              <span className={sombre ? "text-[color:var(--color-secondary-fixed-dim)]" : "text-primary"}>
                {c.unite}
              </span>
            </dd>
            <dt
              className={`mt-sm text-body-md font-semibold ${
                sombre ? "text-[color:var(--nuit-texte)]" : "text-on-surface"
              }`}
            >
              {c.libelle}
            </dt>
            <p
              className={`mt-xs text-body-sm leading-snug ${
                sombre ? "text-[color:var(--nuit-texte-doux)]" : "text-on-surface-variant"
              }`}
            >
              {c.detail}
            </p>
          </div>
        </Reveal>
      ))}
    </dl>
  );
}
