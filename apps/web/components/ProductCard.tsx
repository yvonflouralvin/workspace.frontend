import Link from "next/link";
import { ArrowForward } from "@mui/icons-material";
import { ProduitIcon } from "./icon-map";
import type { Produit } from "../lib/produits";

export function ProductCard({ produit }: { produit: Produit }) {
  return (
    <Link
      href={`/produits/${produit.slug}`}
      className="group flex flex-col gap-md rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card transition-shadow hover:shadow-modal"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-on-primary">
        <ProduitIcon nom={produit.icone} className="!text-[22px]" />
      </span>
      <div>
        <h3 className="text-headline-sm font-display text-on-surface">{produit.nom}</h3>
        <p className="mt-xs text-body-md text-on-surface-variant">{produit.resume}</p>
      </div>
      <span className="mt-auto flex items-center gap-xs text-body-sm font-medium text-primary">
        En savoir plus
        <ArrowForward className="!text-[16px] transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
