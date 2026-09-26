import type { Metadata } from "next";
import { CheckCircle } from "@mui/icons-material";
import { AUTH_APP_URL } from "../../components/nav-links";

export const metadata: Metadata = {
  title: "Tarifs — Solution As A Service",
  description:
    "Des formules qui s'adaptent au nombre de modules activés et à la taille de votre équipe, jusqu'à l'instance dédiée à votre entreprise.",
};

const formules = [
  {
    nom: "Essentiel",
    accroche: "Pour démarrer avec les modules dont vous avez besoin aujourd'hui",
    prix: "Sur devis",
    avantages: [
      "Instance mutualisée, mise en service immédiate",
      "Modules activables à la demande",
      "Mises à jour incluses",
      "Assistance par e-mail",
    ],
    mise_en_avant: false,
  },
  {
    nom: "Croissance",
    accroche: "Pour les équipes qui utilisent plusieurs modules au quotidien",
    prix: "Sur devis",
    avantages: [
      "Tout ce qui est inclus dans Essentiel",
      "Utilisateurs et modules illimités",
      "Circuits d'approbation et tableaux de bord avancés",
      "Assistance prioritaire",
    ],
    mise_en_avant: true,
  },
  {
    nom: "Sur mesure",
    accroche: "Une instance dédiée à votre entreprise, hébergée comme vous le souhaitez",
    prix: "Sur devis",
    avantages: [
      "Instance dédiée, sur nos serveurs ou les vôtres",
      "Inscription fermée, accès réservé à votre organisation",
      "Accompagnement au déploiement et à la migration des données",
      "Interlocuteur dédié",
    ],
    mise_en_avant: false,
  },
];

export default function TarifsPage() {
  return (
    <div className="mx-auto max-w-6xl px-gutter py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-headline-lg font-bold text-on-surface">
          Une formule pour chaque taille d&apos;entreprise
        </h1>
        <p className="mt-sm text-body-lg text-on-surface-variant">
          Le tarif dépend des modules activés et du nombre d&apos;utilisateurs — jamais d&apos;un
          module payant caché derrière un autre. Parlons de votre besoin exact.
        </p>
      </div>

      <div className="mt-xl grid gap-lg lg:grid-cols-3">
        {formules.map((formule) => (
          <div
            key={formule.nom}
            className={`flex flex-col gap-md rounded-2xl border p-lg shadow-card ${
              formule.mise_en_avant
                ? "border-primary bg-primary-container"
                : "border-outline-soft bg-surface-container-lowest"
            }`}
          >
            <div>
              <h2
                className={`text-headline-sm font-display ${
                  formule.mise_en_avant ? "text-on-primary" : "text-on-surface"
                }`}
              >
                {formule.nom}
              </h2>
              <p
                className={`mt-xs text-body-md ${
                  formule.mise_en_avant ? "text-on-primary/85" : "text-on-surface-variant"
                }`}
              >
                {formule.accroche}
              </p>
            </div>

            <p
              className={`font-display text-headline-md font-bold ${
                formule.mise_en_avant ? "text-on-primary" : "text-on-surface"
              }`}
            >
              {formule.prix}
            </p>

            <ul className="flex flex-col gap-sm">
              {formule.avantages.map((avantage) => (
                <li key={avantage} className="flex items-start gap-sm">
                  <CheckCircle
                    className={`!text-[18px] shrink-0 ${
                      formule.mise_en_avant ? "text-on-primary" : "text-secondary"
                    }`}
                  />
                  <span
                    className={`text-body-md ${
                      formule.mise_en_avant ? "text-on-primary/90" : "text-on-surface-variant"
                    }`}
                  >
                    {avantage}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={formule.nom === "Sur mesure" ? "/contact" : `${AUTH_APP_URL}/register`}
              className={`mt-auto rounded-lg px-md py-sm text-center text-body-md font-medium shadow-button transition-opacity hover:opacity-90 ${
                formule.mise_en_avant
                  ? "bg-on-primary text-primary"
                  : "bg-primary text-on-primary"
              }`}
            >
              {formule.nom === "Sur mesure" ? "Nous contacter" : "Essayer gratuitement"}
            </a>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-xl max-w-2xl text-center text-body-sm text-on-surface-variant">
        Une question sur une formule ou sur un module en particulier ?{" "}
        <a href="/contact" className="font-medium text-primary">
          Parlons-en
        </a>
        .
      </p>
    </div>
  );
}
