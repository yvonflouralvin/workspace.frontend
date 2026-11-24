import type { Metadata } from "next";
import {
  EmailOutlined,
  PlaceOutlined,
  ScheduleOutlined,
  RocketLaunchOutlined,
} from "@mui/icons-material";
import { ContactForm } from "./ContactForm";
import { HeroPage } from "../../components/HeroPage";
import { Section } from "../../components/Section";
import { Reveal } from "../../components/Reveal";

export const metadata: Metadata = {
  title: "Contact — Solution As A Service",
  description:
    "Une question sur un module, sur une instance dédiée à votre entreprise, ou envie de voir la plateforme fonctionner avec vos propres données : écrivez-nous.",
};

/** DIRE CE QUI SE PASSE APRÈS L'ENVOI. Un formulaire qui ne promet rien
 *  laisse croire qu'il tombe dans le vide, et c'est souvent vrai ailleurs.
 *  Trois lignes suffisent à le démentir. */
const SUITE = [
  {
    icone: ScheduleOutlined,
    titre: "Une réponse d'une personne",
    texte: "Pas un accusé de réception automatique. Sous un jour ouvré.",
  },
  {
    icone: RocketLaunchOutlined,
    titre: "Une démonstration sur vos cas",
    texte: "Nous préparons l'espace avec vos propres exemples, pas avec les nôtres.",
  },
  {
    icone: EmailOutlined,
    titre: "Un devis écrit",
    texte: "Modules, utilisateurs, hébergement. Détaillé, et sans ligne surprise.",
  },
] as const;

export default function ContactPage() {
  return (
    <>
      <HeroPage
        compact
        surtitre="Contact"
        titre="Parlons de ce qui vous coûte le plus de temps aujourd'hui."
        chapeau="Une question sur un module, sur une instance dédiée à votre entreprise, ou l'envie de voir la plateforme tourner avec vos propres données. Dans les trois cas, écrivez-nous."
      />

      <Section registre="clair">
        <div className="grid gap-xl lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Reveal>
              <h2 className="text-label-sm uppercase text-primary">Ce qui se passe ensuite</h2>
              <div className="mt-lg flex flex-col gap-lg">
                {SUITE.map((s) => (
                  <div key={s.titre} className="flex items-start gap-md">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
                      <s.icone className="!text-[22px]" />
                    </span>
                    <div>
                      <h3 className="font-display text-headline-sm text-on-surface">{s.titre}</h3>
                      <p className="mt-xs text-body-md leading-relaxed text-on-surface-variant">
                        {s.texte}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delai={120}>
              <div className="mt-xl flex flex-col gap-sm rounded-2xl border border-outline-soft bg-surface-container-low p-lg">
                <a
                  href="mailto:contact@solutionaas.com"
                  className="flex items-center gap-sm text-body-md font-medium text-on-surface transition-colors hover:text-primary"
                >
                  <EmailOutlined className="!text-[20px] text-primary" />
                  contact@solutionaas.com
                </a>
                <p className="flex items-center gap-sm text-body-md text-on-surface-variant">
                  <PlaceOutlined className="!text-[20px] text-primary" />
                  Kinshasa, République démocratique du Congo
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delai={80}>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card md:p-xl">
              <h2 className="font-display text-headline-md text-on-surface">Écrivez-nous</h2>
              <p className="mt-xs text-body-md text-on-surface-variant">
                Trois champs, et le plus utile est le dernier.
              </p>
              <div className="mt-lg">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
