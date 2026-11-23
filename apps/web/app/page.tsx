import Link from "next/link";
import {
  ArrowForward,
  BoltOutlined,
  HubOutlined,
  SecurityOutlined,
  SmartToyOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";
import { produits } from "../lib/produits";
import { ProductCard } from "../components/ProductCard";
import { lienAuth } from "../components/nav-links";

const atouts = [
  {
    icone: HubOutlined,
    titre: "Un seul socle, tous les modules",
    texte:
      "Facturation, comptabilité, RH, missions, site web : les modules partagent les mêmes clients, les mêmes membres, les mêmes permissions.",
  },
  {
    icone: BoltOutlined,
    titre: "Actif dès l'activation",
    texte:
      "Chaque module que vous activez se configure lui-même — pas de mise en place technique, pas de formulaire à remplir à la main.",
  },
  {
    icone: SecurityOutlined,
    titre: "Vos données, chez vous ou chez nous",
    texte:
      "Instance mutualisée ou serveur dédié à votre entreprise : le même produit, la même expérience, deux façons de l'héberger.",
  },
  {
    icone: TrendingUpOutlined,
    titre: "Conçu pour grandir",
    texte:
      "D'une petite équipe à plusieurs dizaines de collaborateurs, la plateforme suit votre activité sans qu'il faille en changer.",
  },
];

// Ce que fait un collaborateur virtuel, en trois moments — et non la liste de ce
// qu'il « peut » faire : c'est la différence avec un assistant qu'on interroge.
const moments = [
  {
    titre: "Il travaille à l'heure dite",
    texte:
      "Le point du matin, la relève des écritures du soir, le pointage du lundi : à l'heure, sans qu'on le relance.",
  },
  {
    titre: "Il ne rend pas une demi-réponse",
    texte:
      "S'il lui manque une information, il la demande à qui l'a, attend la réponse, et revient avec le tout.",
  },
  {
    titre: "Tout ce qu'il fait se relit",
    texte:
      "Chaque passage garde la demande reçue, ce qu'il a consulté et ce qu'il a conclu.",
  },
];

const vitrine = produits.slice(0, 8);

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-gutter pb-16 pt-24 text-center">
          <span className="inline-flex items-center rounded-full bg-primary-container px-md py-xs text-label-md font-medium text-on-primary">
            Solution As A Service
          </span>
          <h1 className="mx-auto mt-lg max-w-3xl font-display text-display font-bold tracking-tight text-on-surface">
            Toute votre entreprise, dans une seule plateforme
          </h1>
          <p className="mx-auto mt-md max-w-2xl text-body-lg text-on-surface-variant">
            Facturation, comptabilité, ressources humaines, missions, site web et boutique en
            ligne — des modules pensés pour fonctionner ensemble, pas les uns à côté des autres.
            Et des collaborateurs virtuels qui s&apos;en servent pour vous.
          </p>
          <div className="mt-xl flex flex-col items-center justify-center gap-sm sm:flex-row">
            <a
              href={lienAuth("/register")}
              className="w-full rounded-lg bg-primary px-xl py-md text-body-lg font-medium text-on-primary shadow-button transition-opacity hover:opacity-90 sm:w-auto"
            >
              Essayer gratuitement
            </a>
            <Link
              href="/produits"
              className="w-full rounded-lg border border-outline-soft px-xl py-md text-body-lg font-medium text-on-surface transition-colors hover:bg-surface-container-low sm:w-auto"
            >
              Découvrir les produits
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-outline-soft bg-surface-container-low">
        <div className="mx-auto grid max-w-6xl gap-lg px-gutter py-16 sm:grid-cols-2 lg:grid-cols-4">
          {atouts.map((atout) => (
            <div key={atout.titre} className="flex flex-col gap-sm">
              <atout.icone className="!text-[28px] text-primary" />
              <h3 className="text-headline-sm font-display text-on-surface">{atout.titre}</h3>
              <p className="text-body-md text-on-surface-variant">{atout.texte}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-gutter pt-24">
        <div className="grid gap-xl rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card lg:grid-cols-2 lg:p-xl">
          <div className="flex flex-col items-start gap-md">
            <span className="inline-flex items-center gap-xs rounded-full bg-secondary/15 px-md py-xs text-label-md font-medium text-secondary">
              <SmartToyOutlined className="!text-[16px]" />
              Nouveau
            </span>
            <h2 className="font-display text-headline-lg font-bold text-on-surface">
              Des collaborateurs virtuels, pas un agent conversationnel
            </h2>
            <p className="text-body-lg text-on-surface-variant">
              Un collaborateur virtuel a un métier, des horaires et des droits — les droits de
              ses groupes, comme n&apos;importe quel membre de votre équipe. Il fait le travail
              qui revient sans qu&apos;on le relance, s&apos;ouvre une tâche à son nom quand on
              lui en confie une, et rend compte de ce qu&apos;il a fait.
            </p>
            <Link
              href="/produits/collaborateurs-virtuels"
              className="mt-auto flex items-center gap-xs text-body-md font-medium text-primary"
            >
              Comment ça marche
              <ArrowForward className="!text-[18px]" />
            </Link>
          </div>
          <ul className="flex flex-col gap-md">
            {moments.map((moment) => (
              <li
                key={moment.titre}
                className="rounded-xl border border-outline-soft bg-surface-container-low p-md"
              >
                <h3 className="text-headline-sm font-display text-on-surface">{moment.titre}</h3>
                <p className="mt-xs text-body-md text-on-surface-variant">{moment.texte}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-gutter py-24">
        <div className="flex flex-col items-start justify-between gap-md sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-headline-lg font-bold text-on-surface">
              Un module pour chaque métier de l&apos;entreprise
            </h2>
            <p className="mt-sm max-w-2xl text-body-lg text-on-surface-variant">
              Activez uniquement ce dont vous avez besoin aujourd&apos;hui — chaque nouveau
              module s&apos;ajoute sans rien casser de ce qui tourne déjà.
            </p>
          </div>
          <Link
            href="/produits"
            className="flex shrink-0 items-center gap-xs text-body-md font-medium text-primary"
          >
            Voir tous les produits
            <ArrowForward className="!text-[18px]" />
          </Link>
        </div>

        <div className="mt-xl grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
          {vitrine.map((produit) => (
            <ProductCard key={produit.slug} produit={produit} />
          ))}
        </div>
      </section>

      <section className="bg-primary">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-md px-gutter py-16 text-center">
          <h2 className="font-display text-headline-lg font-bold text-on-primary">
            Prêt à réunir vos outils en un seul endroit ?
          </h2>
          <p className="max-w-2xl text-body-lg text-on-primary/85">
            Créez votre espace de travail en quelques minutes, sans engagement.
          </p>
          <a
            href={lienAuth("/register")}
            className="mt-sm rounded-lg bg-on-primary px-xl py-md text-body-lg font-medium text-primary shadow-button transition-opacity hover:opacity-90"
          >
            Essayer gratuitement
          </a>
        </div>
      </section>
    </>
  );
}
