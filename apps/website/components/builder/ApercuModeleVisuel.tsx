import { ImageOutlined } from "@mui/icons-material";
import type { ApercuModele, BlocApercu } from "@repo/site-widgets/modeles";

/** La vignette d'un modèle, dans le tiroir de choix.
 *
 *  Une esquisse de largeurs de colonnes (des barres grises) ne se distinguait
 *  pas d'une autre : impossible de reconnaître un héros sombre d'un
 *  témoignage sans lire le libellé. Ici chaque bloc du modèle (titre, texte,
 *  bouton, image, liste à icônes) a sa propre forme — assez pour reconnaître
 *  la vignette d'Elementor qu'elle imite, sans aller jusqu'à rejouer le vrai
 *  moteur de rendu pour un aperçu qui n'a jamais vocation à être exact.
 */
export function ApercuModeleVisuel({ apercu }: { apercu: ApercuModele }) {
  const sombre = apercu.sombre ?? false;

  return (
    <div
      className={`flex h-24 gap-2 overflow-hidden rounded-lg p-2.5 ${
        sombre ? "bg-[#0f172a]" : "bg-surface-container"
      }`}
    >
      {apercu.colonnes.map((colonne, i) => (
        <div key={i} style={{ flexGrow: colonne.largeur, flexBasis: 0 }} className="flex min-w-0 flex-col gap-1.5">
          {colonne.blocs.map((bloc, j) => (
            <BlocApercuVisuel key={j} bloc={bloc} sombre={sombre} />
          ))}
        </div>
      ))}
    </div>
  );
}

function BlocApercuVisuel({ bloc, sombre }: { bloc: BlocApercu; sombre: boolean }) {
  const traitClair = sombre ? "bg-white/70" : "bg-on-surface-variant/70";
  const traitDoux = sombre ? "bg-white/35" : "bg-outline-variant";

  switch (bloc) {
    case "titre":
      return <span className={`h-[5px] w-[70%] flex-none rounded-full ${traitClair}`} />;
    case "texte":
      return (
        <span className="flex flex-none flex-col gap-1">
          <span className={`h-[3px] w-full rounded-full ${traitDoux}`} />
          <span className={`h-[3px] w-[75%] rounded-full ${traitDoux}`} />
        </span>
      );
    case "bouton":
      return <span className="h-[9px] w-[42%] flex-none rounded-full bg-primary" />;
    case "icones":
      return (
        <span className="flex flex-none flex-col gap-1">
          {[1, 2, 3].map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`h-[5px] w-[5px] flex-none rounded-full ${sombre ? "bg-white/80" : "bg-primary"}`} />
              <span className={`h-[3px] w-full rounded-full ${traitDoux}`} />
            </span>
          ))}
        </span>
      );
    case "image":
      return (
        <span
          className={`flex flex-1 min-h-[20px] items-center justify-center rounded-md ${
            sombre ? "bg-white/10" : "bg-outline-variant/60"
          }`}
        >
          <ImageOutlined style={{ fontSize: 14 }} className={sombre ? "text-white/50" : "text-outline"} />
        </span>
      );
    default:
      return null;
  }
}
