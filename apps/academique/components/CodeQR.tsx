"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/** Un QR code, rendu en SVG.
 *
 *  **Pas de `dangerouslySetInnerHTML`.** La bibliothèque sait produire une
 *  balise SVG toute faite, mais l'injecter reviendrait à faire confiance à une
 *  chaîne pour du balisage — ici on lit la matrice et on dessine les carrés
 *  nous-mêmes. Le contenu du QR reste une donnée, jamais du code.
 *
 *  SVG et non canvas : il s'imprime net à n'importe quelle taille, et c'est
 *  précisément ce qu'on lui demande — être scanné depuis une feuille.
 */
export function CodeQR({ valeur, taille = 160 }: { valeur: string; taille?: number }) {
  const matrice = useMemo(() => {
    // Type 0 = la version se choisit toute seule selon la longueur. « M » :
    // 15 % de correction d'erreur, ce qui laisse le code lisible malgré un pli
    // ou une tache d'encre.
    const qr = qrcode(0, "M");
    qr.addData(valeur);
    qr.make();
    const n = qr.getModuleCount();
    const cases: { x: number; y: number }[] = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (qr.isDark(y, x)) cases.push({ x, y });
      }
    }
    return { n, cases };
  }, [valeur]);

  const marge = 2;
  const cote = matrice.n + marge * 2;

  return (
    <svg
      width={taille}
      height={taille}
      viewBox={`0 0 ${cote} ${cote}`}
      role="img"
      aria-label="Code QR du lien de suivi"
      shapeRendering="crispEdges"
    >
      <rect width={cote} height={cote} fill="#ffffff" />
      {matrice.cases.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x + marge} y={c.y + marge} width={1} height={1} fill="#000000" />
      ))}
    </svg>
  );
}
