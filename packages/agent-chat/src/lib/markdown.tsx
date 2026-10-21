import { Fragment, type ReactNode } from "react";

/** Rendu Markdown MINIMAL — titres, listes, gras, italique, code, liens.
 *
 *  Pourquoi pas une bibliothèque : l'app porte déjà BlockNote (éditeur), et
 *  ajouter un second analyseur Markdown à toutes les coquilles pour afficher
 *  trois styles coûterait plus de poids que le flux lui-même. Ce qui dépasse ce
 *  vocabulaire s'affiche tel quel : du texte lisible, jamais une balise crue. */

function enLigne(texte: string, cle: string): ReactNode {
  // Un seul passage, une seule expression : des remplacements successifs
  // réécriraient le contenu déjà produit — « **`a`** » perdait son gras.
  const motif = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  const morceaux: ReactNode[] = [];
  let curseur = 0;
  let trouve: RegExpExecArray | null;
  let n = 0;

  while ((trouve = motif.exec(texte)) !== null) {
    if (trouve.index > curseur) morceaux.push(texte.slice(curseur, trouve.index));
    const brut = trouve[0];
    const k = `${cle}-${n++}`;
    if (brut.startsWith("`")) {
      morceaux.push(
        <code
          key={k}
          className="px-1 py-0.5 rounded-sm bg-surface-container text-[0.92em] font-mono text-on-surface"
        >
          {brut.slice(1, -1)}
        </code>
      );
    } else if (brut.startsWith("**")) {
      morceaux.push(
        <strong key={k} className="font-semibold text-on-surface">
          {brut.slice(2, -2)}
        </strong>
      );
    } else if (brut.startsWith("*")) {
      morceaux.push(<em key={k}>{brut.slice(1, -1)}</em>);
    } else {
      const coupure = brut.indexOf("](");
      morceaux.push(
        <a
          key={k}
          href={brut.slice(coupure + 2, -1)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {brut.slice(1, coupure)}
        </a>
      );
    }
    curseur = trouve.index + brut.length;
  }
  if (curseur < texte.length) morceaux.push(texte.slice(curseur));
  return morceaux.length > 0 ? morceaux : texte;
}

export function Markdown({ texte }: { texte: string }) {
  const blocs: ReactNode[] = [];
  const lignes = texte.split("\n");
  let i = 0;

  while (i < lignes.length) {
    const ligne = lignes[i] ?? "";

    if (ligne.startsWith("```")) {
      const langue = ligne.slice(3).trim();
      const corps: string[] = [];
      i++;
      while (i < lignes.length && !(lignes[i] ?? "").startsWith("```")) {
        corps.push(lignes[i] ?? "");
        i++;
      }
      i++;
      blocs.push(
        <pre
          key={`c${i}`}
          className="my-2 p-3 rounded-xl bg-surface-container-low border border-outline-soft overflow-x-auto"
        >
          {langue && (
            <span className="block mb-1.5 text-label-sm uppercase tracking-wide text-on-surface-variant">
              {langue}
            </span>
          )}
          <code className="font-mono text-[12.5px] leading-relaxed text-on-surface whitespace-pre">
            {corps.join("\n")}
          </code>
        </pre>
      );
      continue;
    }

    const titre = /^(#{1,3})\s+(.*)$/.exec(ligne);
    if (titre) {
      const taille = titre[1]!.length === 1 ? "text-body-lg" : "text-body-md";
      blocs.push(
        <p key={`t${i}`} className={`mt-3 mb-1 font-semibold text-on-surface ${taille}`}>
          {enLigne(titre[2] ?? "", `t${i}`)}
        </p>
      );
      i++;
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(ligne)) {
      const puces: string[] = [];
      const numerotee = /^\s*\d+\.\s+/.test(ligne);
      while (i < lignes.length && /^\s*([-*]|\d+\.)\s+/.test(lignes[i] ?? "")) {
        puces.push((lignes[i] ?? "").replace(/^\s*([-*]|\d+\.)\s+/, ""));
        i++;
      }
      const Liste = numerotee ? "ol" : "ul";
      blocs.push(
        <Liste
          key={`l${i}`}
          className={`my-1.5 pl-5 space-y-1 ${numerotee ? "list-decimal" : "list-disc"} marker:text-outline`}
        >
          {puces.map((p, j) => (
            <li key={j}>{enLigne(p, `l${i}-${j}`)}</li>
          ))}
        </Liste>
      );
      continue;
    }

    if (ligne.trim() === "") {
      i++;
      continue;
    }

    const paragraphe: string[] = [];
    while (
      i < lignes.length &&
      (lignes[i] ?? "").trim() !== "" &&
      !(lignes[i] ?? "").startsWith("```") &&
      !/^#{1,3}\s/.test(lignes[i] ?? "") &&
      !/^\s*([-*]|\d+\.)\s+/.test(lignes[i] ?? "")
    ) {
      paragraphe.push(lignes[i] ?? "");
      i++;
    }
    blocs.push(
      <p key={`p${i}`} className="my-1.5 leading-relaxed">
        {paragraphe.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {enLigne(l, `p${i}-${j}`)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <>{blocs}</>;
}
