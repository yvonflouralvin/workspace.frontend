import Link from "next/link";
import { produits } from "../lib/produits";

export function Footer() {
  const annee = new Date().getFullYear();
  const vitrine = produits.slice(0, 6);

  return (
    <footer className="border-t border-outline-soft bg-surface-container-low">
      <div className="mx-auto grid max-w-6xl gap-xl px-gutter py-xl md:grid-cols-4">
        <div>
          <div className="flex items-center gap-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary font-display text-body-md font-bold">
              S
            </span>
            <span className="font-display text-body-md font-bold text-on-surface">
              Solution As A Service
            </span>
          </div>
          <p className="mt-sm text-body-sm text-on-surface-variant">
            Une entreprise de solutions digitales : une seule plateforme, tous les modules
            dont votre activité a besoin pour grandir.
          </p>
        </div>

        <div>
          <h3 className="text-label-md font-medium uppercase tracking-wide text-on-surface-variant">
            Produits
          </h3>
          <ul className="mt-sm flex flex-col gap-xs">
            {vitrine.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/produits/${p.slug}`}
                  className="text-body-sm text-on-surface-variant hover:text-primary"
                >
                  {p.nom}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/produits" className="text-body-sm font-medium text-primary">
                Voir tous les produits →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-label-md font-medium uppercase tracking-wide text-on-surface-variant">
            Entreprise
          </h3>
          <ul className="mt-sm flex flex-col gap-xs">
            <li>
              <Link href="/a-propos" className="text-body-sm text-on-surface-variant hover:text-primary">
                À propos
              </Link>
            </li>
            <li>
              <Link href="/tarifs" className="text-body-sm text-on-surface-variant hover:text-primary">
                Tarifs
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-body-sm text-on-surface-variant hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-label-md font-medium uppercase tracking-wide text-on-surface-variant">
            Contact
          </h3>
          <ul className="mt-sm flex flex-col gap-xs text-body-sm text-on-surface-variant">
            <li>contact@solutionaas.com</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-outline-soft px-gutter py-md">
        <p className="mx-auto max-w-6xl text-body-sm text-on-surface-variant">
          © {annee} Solution As A Service. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
