import { Fenetre } from "./visuels/Fenetre";
import { Reveal } from "./Reveal";
import { HAUTEUR_CAPTURE, LARGEUR_CAPTURE, type Capture } from "../lib/captures";

/** LA GALERIE DE CAPTURES D'UN MODULE.
 *
 *  `width` et `height` sont portés par chaque image, et ce n'est pas
 *  décoratif : sans eux le navigateur ne connaît la place à réserver qu'au
 *  moment où l'image arrive, et toute la page saute sous le curseur du
 *  lecteur. Toutes les captures font 1600 × 1000 ; la contrainte est écrite
 *  une fois dans `lib/captures.ts`.
 *
 *  `loading="lazy"` sauf la première : celle-là est souvent dans le premier
 *  écran, et la retarder ferait attendre pour rien.
 *
 *  Pas de `next/image` ici, délibérément. Les fichiers sont déjà en WebP et
 *  déjà à la bonne taille ; l'optimiseur ne ferait que remettre du calcul sur
 *  le serveur à chaque visite pour un gain nul.
 */
export function Captures({
  captures,
  sombre = false,
}: {
  captures: Capture[];
  sombre?: boolean;
}) {
  if (captures.length === 0) return null;

  return (
    <div className="flex flex-col gap-xl md:gap-20">
      {captures.map((c, i) => (
        <Reveal key={c.fichier} delai={i === 0 ? 0 : 80}>
          <figure className="m-0">
            <Fenetre sombre={sombre}>
              <img
                src={`/captures/${c.fichier}.webp`}
                alt={c.legende}
                width={LARGEUR_CAPTURE}
                height={HAUTEUR_CAPTURE}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="block w-full"
              />
            </Fenetre>
            <figcaption
              className={`mt-md max-w-3xl text-body-md leading-relaxed md:text-body-lg ${
                sombre ? "text-[color:var(--nuit-texte-doux)]" : "text-on-surface-variant"
              }`}
            >
              {c.legende}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
