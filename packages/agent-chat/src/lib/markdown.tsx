import { Fragment, type ReactNode } from "react";

/** Rendu Markdown MINIMAL — titres, listes, tableaux, gras, italique, code, liens.
 *
 *  Pourquoi pas une bibliothèque : l'app porte déjà BlockNote (éditeur), et
 *  ajouter un second analyseur Markdown à toutes les coquilles pour afficher
 *  trois styles coûterait plus de poids que le flux lui-même. Ce qui dépasse ce
 *  vocabulaire s'affiche tel quel : du texte lisible, jamais une balise crue. */

/** Les seuls schémas qu'on rend cliquables. Un chemin relatif passe aussi :
 *  il reste dans l'application. */
export function schemaSur(cible: string): boolean {
  const nettoye = cible.trim();
  if (nettoye.startsWith("/") || nettoye.startsWith("#")) return true;
  // `:` avant le premier `/` ou `?` signifie qu'un schéma est déclaré.
  const fin = nettoye.search(/[/?#]/);
  const tete = fin === -1 ? nettoye : nettoye.slice(0, fin);
  if (!tete.includes(":")) return true;
  return /^(https?|mailto|tel):/i.test(nettoye);
}


/** Les cellules d'une ligne de tableau, sans les barres de bord.
 *  `| a | b |` et `a | b` donnent le même résultat : un modèle écrit les deux. */
function cellules(ligne: string): string[] {
  let t = ligne.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

type Alignement = "left" | "center" | "right";

/** La ligne de séparation d'un tableau — et, si c'en est une, l'alignement
 *  que chaque colonne y déclare (`:--`, `--:`, `:-:`). */
function separateur(ligne: string): Alignement[] | null {
  if (!ligne.includes("-")) return null;
  const parts = cellules(ligne);
  if (parts.length === 0) return null;
  const aligns: Alignement[] = [];
  for (const part of parts) {
    if (!/^:?-{1,}:?$/.test(part)) return null;
    const gauche = part.startsWith(":");
    const droite = part.endsWith(":");
    aligns.push(gauche && droite ? "center" : droite ? "right" : "left");
  }
  return aligns;
}

const CLASSE_ALIGNEMENT: Record<Alignement, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};


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
      const cible = brut.slice(coupure + 2, -1);
      const libelle = brut.slice(1, coupure);
      // Le texte vient d'un MODÈLE : il peut écrire ce qu'il veut, y compris
      // `javascript:` ou `data:text/html`. React bloque aujourd'hui le premier,
      // mais c'est un filet du framework, annoncé comme amovible — et il ne
      // couvre pas `data:`. On décide ici, sur une liste blanche de schémas.
      // Un lien refusé s'affiche en texte : on ne masque pas ce que le modèle
      // a écrit, on refuse seulement de le rendre cliquable.
      morceaux.push(
        schemaSur(cible) ? (
          <a
            key={k}
            href={cible}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {libelle}
          </a>
        ) : (
          <span key={k}>
            {libelle} ({cible})
          </span>
        )
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

    // Tableau : une ligne de cellules SUIVIE d'une ligne de séparation. Le
    // modèle en produit dès qu'on lui demande un comparatif, et sans ce bloc
    // il s'affichait en barres verticales — illisible, et pris pour un bug.
    const aligns = ligne.includes("|") ? separateur(lignes[i + 1] ?? "") : null;
    if (aligns) {
      const entetes = cellules(ligne);
      i += 2;
      const corps: string[][] = [];
      while (i < lignes.length) {
        const brut = lignes[i] ?? "";
        if (brut.trim() === "" || !brut.includes("|")) break;
        corps.push(cellules(brut));
        i++;
      }
      const classe = (j: number) => CLASSE_ALIGNEMENT[aligns[j] ?? "left"];
      blocs.push(
        <div key={`tb${i}`} className="my-2 overflow-x-auto">
          <table className="min-w-full border-collapse text-body-sm">
            <thead>
              <tr>
                {entetes.map((cellule, j) => (
                  <th
                    key={j}
                    className={`px-2 py-1.5 border border-outline-soft bg-surface-row-alt font-semibold text-on-surface whitespace-nowrap ${classe(j)}`}
                  >
                    {enLigne(cellule, `th${i}-${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corps.map((rangee, r) => (
                <tr key={r}>
                  {/* Les colonnes viennent de l'en-tête, jamais de la rangée :
                      une rangée courte laisse une cellule vide, une rangée trop
                      longue ne décale pas tout le tableau. */}
                  {entetes.map((_, j) => (
                    <td
                      key={j}
                      className={`px-2 py-1.5 border border-outline-soft align-top ${classe(j)}`}
                    >
                      {enLigne(rangee[j] ?? "", `td${i}-${r}-${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      !/^\s*([-*]|\d+\.)\s+/.test(lignes[i] ?? "") &&
      !((lignes[i] ?? "").includes("|") && separateur(lignes[i + 1] ?? "") !== null)
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
