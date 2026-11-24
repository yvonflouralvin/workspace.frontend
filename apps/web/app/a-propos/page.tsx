import type { Metadata } from "next";
import { HeroPage } from "../../components/HeroPage";
import { Section, Entete } from "../../components/Section";
import { Reveal } from "../../components/Reveal";
import { Chiffres } from "../../components/Chiffres";
import { Bouton, Fleche } from "../../components/Bouton";
import { lienAuth } from "../../components/nav-links";

export const metadata: Metadata = {
  title: "À propos — Solution As A Service",
  description:
    "Nous concevons et opérons une plateforme unique de modules métier, en République démocratique du Congo, pour les entreprises qui veulent grandir sans multiplier les outils.",
};

/** TROIS PARTIS PRIS, écrits comme des décisions et non comme des valeurs.
 *  « Nous sommes innovants » ne s'oppose à rien ; « un module se configure
 *  lui-même » écarte explicitement le formulaire de paramétrage, donc dit
 *  quelque chose. */
const PARTIS = [
  {
    n: "01",
    titre: "Un seul socle, pas un empilement d'outils",
    texte:
      "Chaque module partage les mêmes membres, les mêmes droits et les mêmes clients que les autres. Jamais une brique isolée de plus à connecter à la main — et jamais le même employé à ressaisir dans un troisième fichier.",
  },
  {
    n: "02",
    titre: "Prêt à l'usage dès l'activation",
    texte:
      "Un module qui a besoin de fabriquer quelque chose pour fonctionner — un établissement, un catalogue, un plan comptable — le fait lui-même. Personne ne devrait remplir un formulaire de configuration avant de commencer à travailler.",
  },
  {
    n: "03",
    titre: "Ce qu'une machine fait, elle doit pouvoir le justifier",
    texte:
      "Nos collaborateurs virtuels travaillent seuls, sur plusieurs tours, avec de vrais droits. Chacun de leurs passages garde donc la demande reçue, ce qu'il a consulté et ce qu'il a conclu. Un agent dont on ne peut pas relire le travail finit par être débranché — et il le mérite.",
  },
] as const;

export default function AProposPage() {
  return (
    <>
      <HeroPage
        surtitre="À propos · Kinshasa, RDC"
        titre={
          <>
            Nous fabriquons le logiciel que nous aurions voulu trouver.{" "}
            <span className="titre-degrade">Et nous l&apos;utilisons.</span>
          </>
        }
        chapeau="Solution As A Service conçoit et opère une plateforme unique de modules métier. Plutôt que de vendre un logiciel par besoin, nous avons construit un socle que chaque module partage, pour que l'ensemble reste cohérent à mesure qu'une entreprise grandit."
      />

      <Section registre="clair" taille="sm">
        <Chiffres />
      </Section>

      <Section registre="creux">
        <Entete
          surtitre="Nos partis pris"
          titre="Trois décisions qui expliquent tout le reste"
          chapeau="Ce ne sont pas des valeurs : ce sont des arbitrages, et chacun a écarté une option crédible. C'est à ça qu'on reconnaît une décision."
        />
        <div className="mt-xl flex flex-col gap-lg">
          {PARTIS.map((p, i) => (
            <Reveal key={p.n} delai={i * 90}>
              <div className="grid gap-md rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card md:grid-cols-[auto_1fr] md:gap-xl md:p-xl">
                <span className="font-display text-[2.5rem] leading-none font-bold tracking-[-0.03em] text-primary/30">
                  {p.n}
                </span>
                <div>
                  <h3 className="font-display text-headline-md leading-snug text-on-surface">
                    {p.titre}
                  </h3>
                  <p className="mt-sm max-w-3xl text-body-lg leading-relaxed text-on-surface-variant">
                    {p.texte}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section registre="nuit" motif>
        <div className="grid gap-xl lg:grid-cols-2 lg:items-center">
          <Entete
            sombre
            surtitre="Notre façon de travailler"
            titre="Nous ajoutons un module quand une entreprise en a besoin, pas quand il ferait bien sur une liste."
            chapeau="Un module naît d'un besoin qu'on a vu de près : une facturation qui doit tenir la TVA, une comptabilité au référentiel OHADA, un cabinet qui suit ses missions client. Nous le construisons avec ceux qui s'en serviront, nous l'utilisons nous-mêmes, puis nous l'ouvrons."
          />
          <Reveal delai={120}>
            <div className="carte-nuit rounded-2xl p-lg md:p-xl">
              <p className="text-body-lg leading-relaxed text-[color:var(--nuit-texte)]">
                « La plateforme gère notre propre entreprise. Nos projets, nos factures, notre
                comptabilité, et nos propres collaborateurs virtuels y travaillent chaque
                jour. »
              </p>
              <p className="mt-lg text-body-sm text-[color:var(--nuit-texte-doux)]">
                C&apos;est la raison pour laquelle un défaut nous coûte avant de vous coûter —
                et c&apos;est la seule garantie qui vaille quelque chose.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section registre="clair">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-on-surface md:text-[2.5rem]">
            Travaillons ensemble.
          </h2>
          <p className="mt-lg text-body-lg leading-relaxed text-on-surface-variant">
            Que vous ayez trois personnes ou trois cents, le point de départ est le même : nous
            dire ce que vous faites, et comment vous le faites aujourd&apos;hui.
          </p>
          <div className="mt-xl flex flex-col items-center justify-center gap-sm sm:flex-row">
            <Bouton href={lienAuth("/register")} externe className="w-full sm:w-auto">
              Essayer gratuitement
              <Fleche />
            </Bouton>
            <Bouton href="/contact" variante="secondaire" className="w-full sm:w-auto">
              Nous écrire
            </Bouton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
