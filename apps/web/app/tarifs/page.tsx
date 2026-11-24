import type { Metadata } from "next";
import { CheckCircle } from "@mui/icons-material";
import { lienAuth } from "../../components/nav-links";
import { HeroPage } from "../../components/HeroPage";
import { Section, Entete } from "../../components/Section";
import { Reveal } from "../../components/Reveal";
import { Bouton, Fleche } from "../../components/Bouton";

export const metadata: Metadata = {
  title: "Tarifs — Solution As A Service",
  description:
    "Le tarif dépend des modules activés et du nombre d'utilisateurs, jamais d'un module payant caché derrière un autre. Jusqu'à l'instance dédiée à votre entreprise.",
};

const formules = [
  {
    nom: "Essentiel",
    accroche: "Pour démarrer avec les modules dont vous avez besoin aujourd'hui",
    prix: "Sur devis",
    avantages: [
      "Instance mutualisée, mise en service immédiate",
      "Modules activables à la demande",
      "Assistant conversationnel sur chaque écran",
      "Mises à jour incluses",
      "Assistance par courriel",
    ],
    enAvant: false,
  },
  {
    nom: "Croissance",
    accroche: "Pour les équipes qui utilisent plusieurs modules au quotidien",
    prix: "Sur devis",
    avantages: [
      "Tout ce qui est inclus dans Essentiel",
      "Utilisateurs et modules illimités",
      "Collaborateurs virtuels : un poste, des horaires, des comptes rendus",
      "Circuits d'approbation et tableaux de bord avancés",
      "Assistance prioritaire",
    ],
    enAvant: true,
  },
  {
    nom: "Sur mesure",
    accroche: "Une instance dédiée à votre entreprise, hébergée comme vous le souhaitez",
    prix: "Sur devis",
    avantages: [
      "Instance dédiée, sur nos serveurs ou les vôtres",
      "Inscription fermée, accès réservé à votre organisation",
      "Accompagnement au déploiement et à la migration",
      "Interlocuteur dédié",
    ],
    enAvant: false,
  },
] as const;

/** CE QUI NE SE PAIE JAMAIS EN SUPPLÉMENT, et le dire est un argument.
 *  Les éditeurs font payer séparément exactement ces choses-là : les droits
 *  fins, le journal d'audit, les notifications, les mises à jour. */
const TOUJOURS = [
  "Les droits par groupe, aussi fins que nécessaire",
  "Le journal d'activité horodaté",
  "Les notifications et la boîte de réception",
  "Les mises à jour, toutes",
  "Le socle partagé entre modules",
  "Vos données exportables",
] as const;

const QUESTIONS = [
  {
    q: "Pourquoi aucun prix affiché ?",
    r: "Parce qu'il dépendrait de deux choses qu'on ne connaît pas avant de vous parler : combien de personnes l'utiliseront, et quels modules vous servent vraiment. Afficher un prix d'appel qui ne tient pas à la première question est pire que ne rien afficher.",
  },
  {
    q: "Un module peut-il en débloquer un autre, payant ?",
    r: "Non. Le tarif dépend des modules activés et du nombre d'utilisateurs — jamais d'une fonction gardée derrière un palier supérieur. Un module activé est entier.",
  },
  {
    q: "Et si je veux héberger chez moi ?",
    r: "C'est la formule « Sur mesure ». Le produit est le même, sans version au rabais : même modules, même socle, mêmes mises à jour. Vous gardez la machine.",
  },
  {
    q: "Puis-je partir avec mes données ?",
    r: "Oui, et c'est prévu plutôt que toléré. Vos données sont exportables, et sur une instance dédiée elles n'ont même jamais quitté vos serveurs.",
  },
  {
    q: "Les collaborateurs virtuels coûtent-ils à l'usage ?",
    r: "Leur travail est borné par un plafond de passages quotidiens, réglable, pour qu'une nuit qui déraille ne coûte rien de surprenant. Nous en parlons franchement au moment du devis.",
  },
] as const;

export default function TarifsPage() {
  return (
    <>
      <HeroPage
        surtitre="Tarifs"
        titre="Vous payez les modules que vous activez, et les gens qui s'en servent."
        chapeau="Jamais une fonction gardée derrière un palier supérieur, jamais un module qui en débloque un autre. Parlons de votre besoin exact — c'est la seule façon d'arriver à un prix juste."
      />

      <Section registre="clair">
        <div className="grid items-start gap-lg lg:grid-cols-3">
          {formules.map((f, i) => (
            <Reveal key={f.nom} delai={i * 100} className="h-full">
              <div
                className={`relative flex h-full flex-col gap-md overflow-hidden rounded-2xl p-lg ${
                  f.enAvant
                    ? "border-2 border-primary bg-surface-container-lowest shadow-[0_28px_70px_-30px_rgb(53_37_205_/_0.45)] lg:-mt-4 lg:pb-xl lg:pt-xl"
                    : "border border-outline-soft bg-surface-container-lowest shadow-card"
                }`}
              >
                {f.enAvant && (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
                    />
                    <span className="absolute right-lg top-lg rounded-full bg-primary px-sm py-[3px] text-label-sm uppercase text-on-primary">
                      Le plus choisi
                    </span>
                  </>
                )}

                <div className="relative">
                  <h2 className="font-display text-headline-md text-on-surface">{f.nom}</h2>
                  <p className="mt-xs text-body-md leading-relaxed text-on-surface-variant">
                    {f.accroche}
                  </p>
                </div>

                <p className="relative font-display text-[1.75rem] leading-none font-bold tracking-[-0.02em] text-on-surface">
                  {f.prix}
                </p>

                <ul className="relative flex flex-col gap-sm">
                  {f.avantages.map((a) => (
                    <li key={a} className="flex items-start gap-sm">
                      <CheckCircle className="!text-[17px] shrink-0 text-secondary" />
                      <span className="text-body-md leading-relaxed text-on-surface-variant">
                        {a}
                      </span>
                    </li>
                  ))}
                </ul>

                <Bouton
                  href={f.nom === "Sur mesure" ? "/contact" : lienAuth("/register")}
                  externe={f.nom !== "Sur mesure"}
                  variante={f.enAvant ? "principal" : "secondaire"}
                  className="relative mt-auto w-full"
                >
                  {f.nom === "Sur mesure" ? "Nous contacter" : "Essayer gratuitement"}
                  <Fleche />
                </Bouton>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section registre="creux">
        <Entete
          surtitre="Toujours inclus"
          titre="Ce que nous ne faisons jamais payer en supplément"
          chapeau="Ce sont, chez beaucoup d'éditeurs, exactement les lignes qui se facturent à part. Elles font ici partie du socle, donc de toutes les formules."
        />
        <div className="mt-xl grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {TOUJOURS.map((t, i) => (
            <Reveal key={t} delai={(i % 3) * 70}>
              <div className="flex items-start gap-sm rounded-xl border border-outline-soft bg-surface-container-lowest p-md">
                <CheckCircle className="!text-[18px] shrink-0 text-secondary" />
                <span className="text-body-md text-on-surface">{t}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section registre="clair">
        <Entete surtitre="Questions" titre="Les cinq questions qu'on nous pose avant de signer" />
        <div className="mt-xl grid gap-lg lg:grid-cols-2">
          {QUESTIONS.map((item, i) => (
            <Reveal key={item.q} delai={(i % 2) * 90}>
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card">
                <h3 className="font-display text-headline-sm leading-snug text-on-surface">
                  {item.q}
                </h3>
                <p className="mt-sm text-body-md leading-relaxed text-on-surface-variant">
                  {item.r}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section registre="nuit" motif>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-[color:var(--nuit-texte)] md:text-[2.5rem]">
            Un devis commence par une conversation.
          </h2>
          <p className="mt-lg text-body-lg leading-relaxed text-[color:var(--nuit-texte-doux)]">
            Dites-nous ce que vous faites, combien vous êtes, et ce qui vous coûte le plus de
            temps aujourd&apos;hui. Le reste en découle.
          </p>
          <div className="mt-xl flex justify-center">
            <Bouton href="/contact">
              Demander un devis
              <Fleche />
            </Bouton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
