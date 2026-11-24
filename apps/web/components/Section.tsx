import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** LE RYTHME DE LA PAGE, en un seul endroit.
 *
 *  Chaque section du site passe par ici. C'est ce qui fait qu'une page a
 *  l'air composée plutôt qu'empilée : la largeur, les marges verticales et la
 *  gouttière ne sont écrites qu'une fois, donc elles ne peuvent pas dériver
 *  d'une section à l'autre.
 *
 *  `registre` choisit le fond. Les deux registres alternent le long de la
 *  page — le clair porte la substance, le sombre porte les moments où l'on
 *  montre la machine. Alterner n'est pas décoratif : c'est ce qui donne à
 *  l'œil des repères pour savoir où il en est dans une page longue.
 */
export function Section({
  children,
  registre = "clair",
  motif = false,
  id,
  className = "",
  taille = "lg",
}: {
  children: ReactNode;
  registre?: "clair" | "creux" | "nuit";
  /** La grille et les halos. Réservé au registre sombre. */
  motif?: boolean;
  id?: string;
  className?: string;
  /** `lg` pour une section de plein droit, `sm` pour une bande. */
  taille?: "lg" | "sm";
}) {
  const fonds = {
    clair: "bg-surface-container-lowest",
    creux: "bg-surface-container-low border-y border-outline-soft",
    nuit: "nuit",
  } as const;

  const hauteurs = {
    lg: "py-20 md:py-28",
    sm: "py-12 md:py-16",
  } as const;

  return (
    <section
      id={id}
      className={`relative overflow-hidden ${fonds[registre]} ${
        motif ? "nuit-grille nuit-halo" : ""
      } ${className}`}
    >
      <div className={`relative mx-auto max-w-6xl px-gutter ${hauteurs[taille]}`}>{children}</div>
    </section>
  );
}

/** L'en-tête d'une section : surtitre, titre, chapeau.
 *
 *  LE SURTITRE N'EST PAS UNE DÉCORATION. Il dit de quoi la section parle en
 *  deux mots, ce qui permet au titre d'être une PHRASE plutôt qu'une
 *  étiquette — « Il ne rend pas une demi-réponse » au lieu de
 *  « Fonctionnalités ». C'est la différence entre un site qui affirme
 *  quelque chose et un site qui range des rubriques.
 */
export function Entete({
  surtitre,
  titre,
  chapeau,
  sombre = false,
  centre = false,
}: {
  surtitre?: string;
  titre: ReactNode;
  chapeau?: ReactNode;
  sombre?: boolean;
  centre?: boolean;
}) {
  return (
    <Reveal className={centre ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {surtitre && (
        <p
          className={`text-label-sm uppercase ${
            sombre ? "text-[color:var(--nuit-texte-doux)]" : "text-primary"
          }`}
        >
          {surtitre}
        </p>
      )}
      <h2
        className={`mt-sm font-display text-[2rem] leading-[1.12] font-bold tracking-[-0.025em] md:text-[2.75rem] ${
          sombre ? "text-[color:var(--nuit-texte)]" : "text-on-surface"
        }`}
      >
        {titre}
      </h2>
      {chapeau && (
        <p
          className={`mt-md text-body-lg leading-relaxed md:text-[1.0625rem] ${
            sombre ? "text-[color:var(--nuit-texte-doux)]" : "text-on-surface-variant"
          }`}
        >
          {chapeau}
        </p>
      )}
    </Reveal>
  );
}

/** Une puce de section : un petit cartouche arrondi, pour une mention
 *  courte posée au-dessus d'un titre de page. */
export function Puce({
  children,
  sombre = false,
}: {
  children: ReactNode;
  sombre?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md font-medium ${
        sombre
          ? "border border-[color:var(--nuit-filet)] bg-[color:var(--nuit-elevee)]/80 text-[color:var(--nuit-texte-doux)] backdrop-blur"
          : "border border-outline-soft bg-surface-container-low text-on-surface-variant"
      }`}
    >
      {children}
    </span>
  );
}
