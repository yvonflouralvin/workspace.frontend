import type { CSSProperties, ReactNode } from "react";

import { FeuilleReactive } from "./FeuilleReactive";
import { RenduNoeud } from "./RenduNoeud";
import { variablesTheme } from "./theme";
import type { ContexteRendu, Lien, Noeud, Theme } from "./types";

export interface ChargeRendu {
  site: { nom: string; slug: string; langue: string; theme: Theme; favicon?: string | null };
  domaine_principal?: string | null;
  entete?: Noeud | null;
  pied?: Noeud | null;
  navigation: { titre: string; chemin: string; est_accueil: boolean }[];
  page: {
    chemin: string;
    titre: string;
    description?: string | null;
    image_og?: string | null;
    indexable: boolean;
    arbre: Noeud;
  };
  apercu: boolean;
}

/** Construit le contexte de rendu.
 *
 *  `urlMedia` et `resoudreLien` sont injectés parce que l'éditeur et la page
 *  publique ne servent pas les médias par le même chemin, et parce que dans le
 *  canevas les liens doivent être neutralisés — un clic y sélectionne un bloc,
 *  il ne navigue pas. */
export function contexteRendu(options: {
  theme?: Theme | null;
  cible?: ContexteRendu["cible"];
  edition?: boolean;
  baseMedia?: string;
  prefixeChemin?: string;
}): ContexteRendu {
  const base = options.baseMedia ?? "/_media";
  const prefixe = options.prefixeChemin ?? "";
  return {
    theme: options.theme ?? {},
    cible: options.cible ?? "bureau",
    edition: options.edition,
    baseMedia: base,
    prefixeChemin: prefixe,
    urlMedia: (jeton) => `${base}/${jeton}`,
    resoudreLien: (lien?: Lien) => {
      if (!lien) return undefined;
      if (lien.page) return `${prefixe}${lien.page}`;
      const href = (lien.href ?? "").trim();
      if (!href) return undefined;
      // Liste blanche de schémas. `javascript:` dans un href est du script
      // exécuté à la place du visiteur, sur le domaine du client.
      if (/^(https?:|mailto:|tel:|#|\/)/i.test(href)) return href;
      return `https://${href}`;
    },
  };
}

/** Le corps d'une page : en-tête partagé, contenu, pied partagé.
 *
 *  Rend exactement la même chose dans le canevas et sur le site — c'est la
 *  raison d'être du package. */
export function RenduPage({
  charge,
  contexte,
  style,
}: {
  charge: ChargeRendu;
  contexte: ContexteRendu;
  style?: CSSProperties;
}): ReactNode {
  const variables = variablesTheme(charge.site.theme) as CSSProperties;
  return (
    <div
      style={{
        ...variables,
        background: "var(--site-fond)",
        color: "var(--site-texte)",
        fontFamily: "var(--site-police-texte)",
        minHeight: "100%",
        ...style,
      }}
    >
      <FeuilleReactive arbre={charge.entete} contexte={contexte} />
      <FeuilleReactive arbre={charge.page.arbre} contexte={contexte} />
      <FeuilleReactive arbre={charge.pied} contexte={contexte} />

      {charge.entete ? (
        <header>
          <RenduNoeud noeud={charge.entete} contexte={contexte} />
        </header>
      ) : null}
      <main>
        <RenduNoeud noeud={charge.page.arbre} contexte={contexte} />
      </main>
      {charge.pied ? (
        <footer>
          <RenduNoeud noeud={charge.pied} contexte={contexte} />
        </footer>
      ) : null}
    </div>
  );
}

/** La coque d'un site — en-tête, contenu quelconque, pied.
 *
 *  Ce que `RenduPage` fait pour un arbre de page, celle-ci le fait pour du
 *  contenu que le builder n'a pas produit : la vitrine, une fiche produit, un
 *  panier. Sans elle, ces écrans devraient recopier le thème, les variables CSS
 *  et le rendu de l'en-tête — et divergeraient à la première retouche.
 */
export function RenduChrome({
  charge,
  contexte,
  children,
}: {
  charge: Pick<ChargeRendu, "site" | "entete" | "pied">;
  contexte: ContexteRendu;
  children: ReactNode;
}): ReactNode {
  const variables = variablesTheme(charge.site.theme) as CSSProperties;
  return (
    <div
      style={{
        ...variables,
        background: "var(--site-fond)",
        color: "var(--site-texte)",
        fontFamily: "var(--site-police-texte)",
        minHeight: "100%",
      }}
    >
      <FeuilleReactive arbre={charge.entete} contexte={contexte} />
      <FeuilleReactive arbre={charge.pied} contexte={contexte} />

      {charge.entete ? (
        <header>
          <RenduNoeud noeud={charge.entete} contexte={contexte} />
        </header>
      ) : null}
      <main>{children}</main>
      {charge.pied ? (
        <footer>
          <RenduNoeud noeud={charge.pied} contexte={contexte} />
        </footer>
      ) : null}
    </div>
  );
}
