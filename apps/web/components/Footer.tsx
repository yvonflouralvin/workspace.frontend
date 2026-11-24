import Link from "next/link";
import { produits } from "../lib/produits";
import { Marque } from "./Marque";
import { lienAuth } from "./nav-links";

/** LE PIED, dans le registre sombre.
 *
 *  Il prolonge l'appel final au lieu de le contredire : la page descend vers
 *  le noir et s'y arrête. Un pied clair après une bande sombre fait un
 *  sandwich, et l'œil croit qu'il reste du contenu.
 */
export function Footer() {
  const annee = new Date().getFullYear();
  const colonnes = [
    {
      titre: "Modules",
      liens: [
        ...produits.slice(0, 6).map((p) => ({ l: p.nom, h: `/produits/${p.slug}` })),
        { l: "Voir les quinze", h: "/produits" },
      ],
    },
    {
      titre: "Entreprise",
      liens: [
        { l: "À propos", h: "/a-propos" },
        { l: "Tarifs", h: "/tarifs" },
        { l: "Contact", h: "/contact" },
      ],
    },
  ];

  return (
    <footer className="nuit nuit-grille relative overflow-hidden border-t border-[color:var(--nuit-filet)]">
      <div className="relative mx-auto max-w-6xl px-gutter py-xl">
        <div className="grid gap-xl md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-sm">
              <Marque className="h-9 w-9" sombre />
              <span className="font-display text-body-md font-bold text-[color:var(--nuit-texte)]">
                Solution As A Service
              </span>
            </div>
            <p className="mt-md max-w-sm text-body-sm leading-relaxed text-[color:var(--nuit-texte-doux)]">
              Une seule plateforme pour toute l&apos;entreprise — et des collaborateurs virtuels
              qui s&apos;en servent. Conçue et opérée en République démocratique du Congo.
            </p>
            <a
              href={lienAuth("/register")}
              className="mt-lg inline-flex items-center gap-sm rounded-xl border border-[color:var(--nuit-filet)] bg-[color:var(--nuit-elevee)] px-md py-sm text-body-sm font-semibold text-[color:var(--nuit-texte)] transition-colors hover:border-[color:var(--halo-indigo)]"
            >
              Créer mon espace
            </a>
          </div>

          {colonnes.map((col) => (
            <div key={col.titre}>
              <h3 className="text-label-sm uppercase text-[color:var(--nuit-texte-doux)]">
                {col.titre}
              </h3>
              <ul className="mt-md flex flex-col gap-sm">
                {col.liens.map((lien) => (
                  <li key={lien.h}>
                    <Link
                      href={lien.h}
                      className="text-body-sm text-[color:var(--nuit-texte-doux)] transition-colors hover:text-[color:var(--nuit-texte)]"
                    >
                      {lien.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-label-sm uppercase text-[color:var(--nuit-texte-doux)]">Contact</h3>
            <ul className="mt-md flex flex-col gap-sm text-body-sm text-[color:var(--nuit-texte-doux)]">
              <li>
                <a
                  href="mailto:contact@solutionaas.com"
                  className="transition-colors hover:text-[color:var(--nuit-texte)]"
                >
                  contact@solutionaas.com
                </a>
              </li>
              <li>Kinshasa, RDC</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="relative border-t border-[color:var(--nuit-filet)] px-gutter py-md">
        <p className="mx-auto max-w-6xl text-body-sm text-[color:var(--nuit-texte-doux)]">
          © {annee} Solution As A Service. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
