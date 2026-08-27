import type { CSSProperties, ReactNode } from "react";

/** Sérialise le JSON de blocs produit par BlockNote en JSX.
 *
 *  Deux raisons de ne pas utiliser le convertisseur HTML de la bibliothèque :
 *
 *  1. **L'échappement est acquis par construction.** On ne fait jamais de
 *     `dangerouslySetInnerHTML` ; React échappe le texte. Quelqu'un qui colle
 *     `<script>` dans l'éditeur obtient le TEXTE `<script>`, pas un script —
 *     et ce contenu sera servi sur le domaine d'un client.
 *  2. `blocksToHTMLLossy` a besoin d'un environnement navigateur, alors que la
 *     page publique est rendue côté serveur.
 *
 *  On couvre le sous-ensemble qu'un site utilise. Un type de bloc inconnu rend
 *  son texte brut plutôt que de faire tomber la page. */

interface Style {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

interface Fragment {
  type?: string;
  text?: string;
  styles?: Style;
  href?: string;
  content?: Fragment[] | string;
}

export interface Bloc {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: Fragment[] | string;
  children?: Bloc[];
}

function styleDe(styles?: Style): CSSProperties | undefined {
  if (!styles) return undefined;
  const css: CSSProperties = {};
  if (styles.bold) css.fontWeight = 700;
  if (styles.italic) css.fontStyle = "italic";
  if (styles.strike) css.textDecoration = "line-through";
  if (styles.underline) {
    css.textDecoration = styles.strike ? "line-through underline" : "underline";
  }
  if (styles.textColor && styles.textColor !== "default") css.color = styles.textColor;
  if (styles.backgroundColor && styles.backgroundColor !== "default") {
    css.backgroundColor = styles.backgroundColor;
  }
  if (styles.code) {
    css.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    css.fontSize = "0.9em";
  }
  return Object.keys(css).length ? css : undefined;
}

function rendreFragments(contenu: Fragment[] | string | undefined, cle = "f"): ReactNode {
  if (typeof contenu === "string") return contenu;
  if (!Array.isArray(contenu)) return null;
  return contenu.map((fragment, i) => {
    const id = `${cle}-${i}`;
    if (fragment.type === "link") {
      return (
        <a
          key={id}
          href={fragment.href}
          style={{ color: "var(--site-primaire)", textDecoration: "underline" }}
        >
          {rendreFragments(fragment.content, id)}
        </a>
      );
    }
    const css = styleDe(fragment.styles);
    const texte = fragment.text ?? "";
    return css ? (
      <span key={id} style={css}>
        {texte}
      </span>
    ) : (
      <span key={id}>{texte}</span>
    );
  });
}

const NIVEAUX = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

function rendreBloc(bloc: Bloc, cle: string): ReactNode {
  const contenu = rendreFragments(bloc.content, cle);
  const alignement = bloc.props?.textAlignment as string | undefined;
  const style: CSSProperties = alignement ? { textAlign: alignement as CSSProperties["textAlign"] } : {};

  switch (bloc.type) {
    case "heading": {
      const niveau = Number(bloc.props?.level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6;
      const Balise = (NIVEAUX[niveau] ?? "h2") as "h1";
      return (
        <Balise
          key={cle}
          style={{ ...style, fontFamily: "var(--site-police-titre)", margin: "1.2em 0 0.5em" }}
        >
          {contenu}
        </Balise>
      );
    }
    case "bulletListItem":
    case "numberedListItem":
      return (
        <li key={cle} style={style}>
          {contenu}
          {bloc.children?.length ? rendreListe(bloc.children, cle) : null}
        </li>
      );
    case "quote":
      return (
        <blockquote
          key={cle}
          style={{
            ...style,
            borderLeft: "3px solid var(--site-primaire)",
            paddingLeft: 16,
            margin: "1em 0",
            color: "var(--site-texte-doux)",
          }}
        >
          {contenu}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          key={cle}
          style={{
            background: "#0f172a",
            color: "#e2e8f0",
            padding: 16,
            borderRadius: "var(--site-rayon)",
            overflowX: "auto",
          }}
        >
          <code>{typeof bloc.content === "string" ? bloc.content : contenu}</code>
        </pre>
      );
    default:
      return (
        <p key={cle} style={{ ...style, margin: "0 0 1em" }}>
          {contenu}
        </p>
      );
  }
}

function rendreListe(blocs: Bloc[], cle: string): ReactNode {
  const numerotee = blocs[0]?.type === "numberedListItem";
  const Balise = numerotee ? "ol" : "ul";
  return (
    <Balise key={`${cle}-l`} style={{ paddingLeft: 24, margin: "0 0 1em" }}>
      {blocs.map((bloc, i) => rendreBloc(bloc, `${cle}-l-${i}`))}
    </Balise>
  );
}

/** Regroupe les items de liste consécutifs sous un seul `<ul>`/`<ol>` :
 *  BlockNote les stocke à plat, et les rendre un par un produirait une puce
 *  par liste. */
export function RichText({ blocs }: { blocs: unknown }) {
  if (typeof blocs === "string") return <p style={{ margin: "0 0 1em" }}>{blocs}</p>;
  if (!Array.isArray(blocs)) return null;

  const sortie: ReactNode[] = [];
  let paquet: Bloc[] = [];

  const vider = (index: number) => {
    if (!paquet.length) return;
    sortie.push(rendreListe(paquet, `b${index}`));
    paquet = [];
  };

  (blocs as Bloc[]).forEach((bloc, i) => {
    const estItem = bloc.type === "bulletListItem" || bloc.type === "numberedListItem";
    if (estItem) {
      if (paquet.length && paquet[0]!.type !== bloc.type) vider(i);
      paquet.push(bloc);
      return;
    }
    vider(i);
    sortie.push(rendreBloc(bloc, `b${i}`));
  });
  vider(blocs.length);

  return <>{sortie}</>;
}
