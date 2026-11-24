import {
  AutoAwesomeOutlined,
  GroupsOutlined,
  HistoryEduOutlined,
  LockOutlined,
  StorageOutlined,
  VerifiedUserOutlined,
} from "@mui/icons-material";
import { produits } from "../lib/produits";
import { ProductCard } from "../components/ProductCard";
import { lienAuth } from "../components/nav-links";
import { Bouton, Fleche } from "../components/Bouton";
import { Section, Entete, Puce } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Chiffres } from "../components/Chiffres";
import { Bandeau } from "../components/Bandeau";
import { Console } from "../components/visuels/Console";
import { Socle } from "../components/visuels/Socle";
import { BoucleAgent } from "../components/visuels/BoucleAgent";
import { Captures } from "../components/Captures";
import { capturesDe, type Capture } from "../lib/captures";

/** LES TROIS ÉCRANS DE L'ACCUEIL.
 *
 *  Un de chaque registre : ce que le produit a de singulier (un collaborateur
 *  qui rend compte), ce que tout le monde comprend sans explication (une liste
 *  de factures), et ce qui dit que le socle est sérieux (une comptabilité
 *  OHADA). Trois suffisent : au-delà, on ne les regarde plus.
 *
 *  Ils sont PRIS dans `lib/captures.ts`, jamais recopiés : une légende
 *  réécrite ici divergerait de la fiche produit sans que rien ne le dise. */
const ECRANS_ACCUEIL = [
  capturesDe("collaborateurs-virtuels")[1],
  capturesDe("facturation")[0],
  capturesDe("comptabilite")[0],
].filter((c): c is Capture => Boolean(c));

/** CE QUE LE COLLABORATEUR VIRTUEL FAIT, en trois moments — et non la liste
 *  de ce qu'il « peut » faire. C'est la différence avec un agent
 *  conversationnel, et c'est la phrase qui vend. */
const MOMENTS = [
  {
    titre: "Il travaille à l'heure dite",
    texte:
      "Le point du matin, la relève des écritures du soir, le pointage du lundi. À l'heure, sans qu'on le relance, dans le fuseau de votre entreprise.",
  },
  {
    titre: "Il ne rend pas une demi-réponse",
    texte:
      "S'il lui manque une information, il la demande à qui l'a, attend la réponse, et revient avec le tout. Jamais un « j'ai demandé à untel ».",
  },
  {
    titre: "Tout ce qu'il fait se relit",
    texte:
      "Chaque passage garde la demande reçue, ce qu'il a consulté et ce qu'il a conclu. Un agent dont on ne peut pas relire le travail finit débranché.",
  },
] as const;

/** LA CONFIANCE SE PROUVE EN NOMMANT DES MÉCANISMES, pas en promettant la
 *  sécurité. Chacun de ces six points est vérifiable dans le produit en
 *  quelques clics — c'est le critère qui a décidé de la liste. */
const CONFIANCE = [
  {
    icone: GroupsOutlined,
    titre: "Des droits par groupe, pas par personne",
    texte:
      "Une équipe survit aux arrivées et aux départs ; une liste de personnes se périme sans que personne s'en aperçoive. Et chaque module refait son propre contrôle.",
  },
  {
    icone: HistoryEduOutlined,
    titre: "Un journal d'activité horodaté",
    texte:
      "Qui a fait quoi, et quand, sur tout l'espace de travail — y compris les collaborateurs virtuels, qui y laissent la même trace qu'un humain.",
  },
  {
    icone: StorageOutlined,
    titre: "Vos données chez vous, si vous le voulez",
    texte:
      "Instance mutualisée pour démarrer en quelques minutes, ou instance dédiée sur nos serveurs comme sur les vôtres. Le même produit, sans version au rabais.",
  },
  {
    icone: LockOutlined,
    titre: "Un collaborateur virtuel n'a que SES droits",
    texte:
      "Ceux de ses groupes, comme n'importe quel membre. Et vous réglez qui peut le solliciter, et jusqu'où : rien, lecture seule, ou écriture.",
  },
  {
    icone: VerifiedUserOutlined,
    titre: "Une comptabilité au référentiel OHADA",
    texte:
      "Plan comptable chargeable en un clic, journaux, exercices, équilibre débit-crédit imposé, grand livre et balance. Pas une adaptation d'un logiciel étranger.",
  },
  {
    icone: AutoAwesomeOutlined,
    titre: "Un module actif dès l'activation",
    texte:
      "Celui qui a besoin de fabriquer quelque chose pour fonctionner le fait lui-même. Personne ne devrait remplir un formulaire de configuration avant de commencer.",
  },
] as const;

const ETAPES = [
  {
    n: "01",
    titre: "Vous créez votre espace",
    texte: "Quelques minutes, sans engagement, sans intervention de notre part.",
  },
  {
    n: "02",
    titre: "Vous activez ce qui vous sert",
    texte:
      "Un module aujourd'hui, trois le mois prochain. Chacun s'ajoute sans rien casser de ce qui tourne déjà.",
  },
  {
    n: "03",
    titre: "Vous confiez un poste à un collaborateur",
    texte:
      "Vous lui écrivez son métier et ses horaires. Il travaille, il délègue s'il faut, il rend compte.",
  },
] as const;

const vitrine = produits.slice(0, 8);

export default function HomePage() {
  return (
    <>
      {/* ══ LE HERO ══════════════════════════════════════════════════════ */}
      <section className="nuit nuit-grille nuit-halo relative overflow-hidden">
        {/* Le halo dérive lentement : la page respire sans que rien ne
            bouge vraiment. Dix-huit secondes par cycle — assez lent pour
            qu'on ne le remarque pas, assez pour qu'on le sente. */}
        <span
          aria-hidden="true"
          className="anim-halo pointer-events-none absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--halo-indigo) 55%, transparent), transparent 65%)",
          }}
        />

        <div className="ouverture relative mx-auto max-w-6xl px-gutter pb-20 md:pb-28">
          <Reveal className="mx-auto max-w-4xl text-center">
            <Puce sombre>
              <span className="anim-pulse h-[6px] w-[6px] rounded-full bg-[color:var(--color-secondary-fixed-dim)]" />
              Plateforme de gestion d&apos;entreprise · République démocratique du Congo
            </Puce>

            <h1 className="mt-lg font-display text-[2.5rem] leading-[1.05] font-bold tracking-[-0.035em] text-[color:var(--nuit-texte)] sm:text-[3.25rem] lg:text-[4.25rem]">
              Un logiciel pour toute l&apos;entreprise.
              <br className="hidden sm:block" />{" "}
              <span className="titre-degrade">Et des collaborateurs qui s&apos;en servent.</span>
            </h1>

            <p className="mx-auto mt-lg max-w-2xl text-body-lg leading-relaxed text-[color:var(--nuit-texte-doux)] md:text-[1.125rem]">
              Facturation, comptabilité, ressources humaines, projets, site web — quinze modules
              sur un seul socle. Et des collaborateurs virtuels qui y travaillent à votre place :
              ils ont un métier, des horaires, des droits, et ils rendent compte.
            </p>

            <div className="mt-xl flex flex-col items-center justify-center gap-sm sm:flex-row">
              <Bouton href={lienAuth("/register")} externe className="w-full sm:w-auto">
                Essayer gratuitement
                <Fleche />
              </Bouton>
              <Bouton href="/produits" variante="nuit" className="w-full sm:w-auto">
                Voir les quinze modules
              </Bouton>
            </div>

            <p className="mt-lg text-body-sm text-[color:var(--nuit-texte-doux)]">
              Sans engagement · Mise en service immédiate · Vos données chez vous ou chez nous
            </p>
          </Reveal>

          <Reveal delai={180} className="mt-20">
            <Console />
          </Reveal>
        </div>

        <Bandeau />
      </section>

      {/* ══ LES CHIFFRES ═════════════════════════════════════════════════ */}
      <Section registre="clair" taille="sm">
        <Chiffres />
      </Section>

      {/* ══ LE SOCLE ═════════════════════════════════════════════════════ */}
      <Section registre="creux">
        <Entete
          surtitre="Un seul socle"
          titre={
            <>
              Six logiciels qui ne se parlent pas,
              <br className="hidden md:block" /> c&apos;est six fois le même client à saisir.
            </>
          }
          chapeau="La plupart des entreprises achètent un outil par besoin, puis passent leur temps à les faire coïncider : le même employé dans trois fichiers, le même client sous deux orthographes, et personne qui sache lequel a raison. Ici, il n'y a rien à faire coïncider."
        />
        <Reveal className="mt-xl">
          <Socle />
        </Reveal>
      </Section>

      {/* ══ LES COLLABORATEURS VIRTUELS ══════════════════════════════════ */}
      <Section registre="nuit" motif id="collaborateurs">
        <Entete
          sombre
          surtitre="Collaborateurs virtuels"
          titre={
            <>
              Ce n&apos;est pas un agent conversationnel.{" "}
              <span className="titre-degrade">C&apos;est un poste.</span>
            </>
          }
          chapeau="On ne lui pose pas des questions : on lui confie du travail. Il a un profil, des tâches qui reviennent et leurs horaires, et les droits de ses groupes — comme n'importe quel membre de votre équipe."
        />

        <Reveal delai={120} className="mt-xl">
          <div className="carte-nuit rounded-2xl p-lg md:p-xl">
            <BoucleAgent />
          </div>
        </Reveal>

        <div className="mt-xl grid gap-lg md:grid-cols-3">
          {MOMENTS.map((m, i) => (
            <Reveal key={m.titre} delai={i * 110}>
              <div className="h-full rounded-2xl border border-[color:var(--nuit-filet)] bg-[color:var(--nuit-elevee)]/60 p-lg">
                <h3 className="font-display text-headline-sm text-[color:var(--nuit-texte)]">
                  {m.titre}
                </h3>
                <p className="mt-sm text-body-md leading-relaxed text-[color:var(--nuit-texte-doux)]">
                  {m.texte}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delai={120} className="mt-xl">
          <Bouton href="/produits/collaborateurs-virtuels" variante="nuit">
            Comment ça marche, en détail
            <Fleche />
          </Bouton>
        </Reveal>
      </Section>

      {/* ══ LA PREUVE PAR L'ÉCRAN ════════════════════════════════════════
          Un site de logiciel qui ne montre pas le logiciel demande qu'on le
          croie sur parole. Trois écrans, pris sur un espace réel, et le
          visiteur n'a plus à nous croire. ═══════════════════════════════ */}
      <Section registre="creux" id="ecrans">
        <Entete
          surtitre="En conditions réelles"
          titre={
            <>
              Trois écrans, pris sur un espace de travail qui tourne.{" "}
              <span className="titre-degrade">Aucune maquette.</span>
            </>
          }
          chapeau="Une entreprise de distribution de Kinshasa, douze mois d'activité : six cent vingt-trois commandes, deux cent quatre-vingt-dix-sept écritures comptables, cinq collaborateurs virtuels qui travaillent chaque matin."
        />
        <div className="mt-xl md:mt-20">
          <Captures captures={ECRANS_ACCUEIL} />
        </div>
        <Reveal className="mt-xl">
          <Bouton href="/produits" variante="secondaire">
            Voir les écrans de chaque module
            <Fleche />
          </Bouton>
        </Reveal>
      </Section>

      {/* ══ LES MODULES ══════════════════════════════════════════════════ */}
      <Section registre="clair">
        <div className="flex flex-col items-start justify-between gap-lg md:flex-row md:items-end">
          <Entete
            surtitre="Les modules"
            titre="Un module pour chaque métier de l'entreprise"
            chapeau="Activez uniquement ce dont vous avez besoin aujourd'hui. Chaque nouveau module s'ajoute sans rien casser de ce qui tourne déjà — et partage aussitôt vos membres, vos droits et vos clients."
          />
          <Reveal>
            <Bouton href="/produits" variante="secondaire">
              Les quinze modules
              <Fleche />
            </Bouton>
          </Reveal>
        </div>

        <div className="mt-xl grid gap-lg sm:grid-cols-2 lg:grid-cols-4">
          {vitrine.map((produit, i) => (
            <Reveal key={produit.slug} delai={(i % 4) * 80}>
              <ProductCard produit={produit} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ══ LA CONFIANCE ═════════════════════════════════════════════════ */}
      <Section registre="creux">
        <Entete
          centre
          surtitre="Ce qui doit tenir"
          titre="La confiance ne se promet pas, elle se vérifie"
          chapeau="Six mécanismes, pas six adjectifs. Chacun se constate dans le produit en quelques clics — c'est le critère qui a décidé de cette liste."
        />

        <div className="mt-xl grid gap-lg md:grid-cols-2 lg:grid-cols-3">
          {CONFIANCE.map((c, i) => (
            <Reveal key={c.titre} delai={(i % 3) * 90}>
              <div className="flex h-full flex-col gap-sm rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card">
                <c.icone className="!text-[26px] text-primary" />
                <h3 className="font-display text-headline-sm leading-snug text-on-surface">
                  {c.titre}
                </h3>
                <p className="text-body-md leading-relaxed text-on-surface-variant">{c.texte}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ══ DÉMARRER ═════════════════════════════════════════════════════ */}
      <Section registre="clair">
        <Entete surtitre="Démarrer" titre="Trois étapes, et aucune ne demande un technicien" />

        <div className="mt-xl grid gap-lg md:grid-cols-3">
          {ETAPES.map((e, i) => (
            <Reveal key={e.n} delai={i * 110}>
              <div className="relative h-full rounded-2xl border border-outline-soft bg-surface-container-lowest p-lg shadow-card">
                <span className="font-display text-[2.5rem] leading-none font-bold tracking-[-0.03em] text-primary/30">
                  {e.n}
                </span>
                <h3 className="mt-md font-display text-headline-sm text-on-surface">{e.titre}</h3>
                <p className="mt-sm text-body-md leading-relaxed text-on-surface-variant">
                  {e.texte}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ══ L'APPEL FINAL ════════════════════════════════════════════════ */}
      <Section registre="nuit" motif>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-[2rem] leading-[1.1] font-bold tracking-[-0.03em] text-[color:var(--nuit-texte)] md:text-[3rem]">
            Réunissez vos outils.{" "}
            <span className="titre-degrade">Puis confiez-leur du travail.</span>
          </h2>
          <p className="mx-auto mt-lg max-w-xl text-body-lg leading-relaxed text-[color:var(--nuit-texte-doux)]">
            Créez votre espace de travail en quelques minutes. Vous activerez les modules au
            rythme de votre activité, et vous saurez à tout moment qui a fait quoi.
          </p>
          <div className="mt-xl flex flex-col items-center justify-center gap-sm sm:flex-row">
            <Bouton href={lienAuth("/register")} externe className="w-full sm:w-auto">
              Essayer gratuitement
              <Fleche />
            </Bouton>
            <Bouton href="/contact" variante="nuit" className="w-full sm:w-auto">
              Parler à quelqu&apos;un
            </Bouton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
