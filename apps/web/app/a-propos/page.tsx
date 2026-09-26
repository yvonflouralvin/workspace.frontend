import type { Metadata } from "next";
import { HubOutlined, VerifiedUserOutlined, RocketLaunchOutlined } from "@mui/icons-material";

export const metadata: Metadata = {
  title: "À propos — Solution As A Service",
  description:
    "Solution As A Service conçoit et opère une plateforme unique de modules métier pour les entreprises qui veulent grandir sans multiplier les outils.",
};

const valeurs = [
  {
    icone: HubOutlined,
    titre: "Un seul socle, pas un empilement d'outils",
    texte:
      "Chaque module que nous construisons partage les mêmes membres, les mêmes permissions et les mêmes clients que les autres — jamais une brique isolée de plus à connecter à la main.",
  },
  {
    icone: RocketLaunchOutlined,
    titre: "Prêt à l'usage dès l'activation",
    texte:
      "Un module qui a besoin de fabriquer quelque chose pour fonctionner — un établissement, un catalogue — le fait lui-même à l'activation. Personne ne devrait remplir un formulaire de configuration avant de commencer.",
  },
  {
    icone: VerifiedUserOutlined,
    titre: "Vos données restent les vôtres",
    texte:
      "Instance mutualisée pour démarrer vite, ou instance dédiée sur nos serveurs comme sur les vôtres pour les entreprises qui en ont besoin — le même produit, sans compromis sur la propriété des données.",
  },
];

export default function AProposPage() {
  return (
    <div className="mx-auto max-w-6xl px-gutter py-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-headline-lg font-bold text-on-surface">
          Nous fabriquons les outils numériques dont votre entreprise a besoin
        </h1>
        <p className="mt-md text-body-lg text-on-surface-variant">
          Solution As A Service est une entreprise spécialisée dans la fourniture de solutions
          digitales. Plutôt que de vendre un logiciel par besoin, nous avons construit une
          plateforme unique où chaque module — facturation, comptabilité, ressources humaines,
          gestion de missions, site web — partage le même socle, pour que l&apos;ensemble reste
          cohérent à mesure qu&apos;une entreprise grandit et active de nouveaux usages.
        </p>
      </div>

      <div className="mt-16 grid gap-lg sm:grid-cols-3">
        {valeurs.map((valeur) => (
          <div key={valeur.titre} className="flex flex-col gap-sm">
            <valeur.icone className="!text-[28px] text-primary" />
            <h2 className="text-headline-sm font-display text-on-surface">{valeur.titre}</h2>
            <p className="text-body-md text-on-surface-variant">{valeur.texte}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-outline-soft bg-surface-container-low p-lg">
        <h2 className="text-headline-sm font-display text-on-surface">Notre façon de travailler</h2>
        <p className="mt-sm text-body-lg text-on-surface-variant">
          Nous ajoutons des modules à la plateforme au rythme des besoins réels des entreprises
          qui nous font confiance — un module métier spécialisé naît d&apos;un besoin précis, puis
          rejoint le socle commun pour que toute la plateforme en profite. C&apos;est ce qui nous
          permet de couvrir aujourd&apos;hui la facturation, la comptabilité, les ressources
          humaines, la gestion de missions professionnelles, la gestion hospitalière, la gestion
          scolaire et la présence en ligne — sans jamais faire de chaque nouveau module un
          logiciel à part.
        </p>
      </div>
    </div>
  );
}
