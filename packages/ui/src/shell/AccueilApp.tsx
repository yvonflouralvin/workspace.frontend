"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LockOutlined } from "@mui/icons-material";

import type { NavItem } from "../types/shell";
import { PLATFORM_APPS } from "./platform";
import { AccueilRaccourcis } from "./AccueilRaccourcis";

/** Un raccourci configuré sur un groupe : une carte vers un écran précis. */
export interface LienRapide {
  id?: number;
  libelle: string;
  description: string | null;
  app_key: string;
  chemin: string | null;
  icone: string | null;
  position: number;
}

/** L'écran d'accueil résolu par `auth` depuis les groupes du membre. */
export interface AccueilResolu {
  landing_app_key: string | null;
  accueil_personnalise: boolean;
  liens_rapides: LienRapide[];
  groupe: { id: number; name: string } | null;
}

const WORKSPACE_URL = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005";

/** Où mène « Accueil » POUR CETTE PERSONNE.
 *
 *  Workspace reste le défaut, mais un membre dont le groupe atterrit ailleurs
 *  n'a rien à y faire — l'entrée le renvoyait vers une app où il n'a parfois
 *  aucun droit. Le chez-soi de quelqu'un, c'est la page de démarrage qu'on lui
 *  a donnée.
 */
export function urlAccueil(landingAppKey?: string | null): string {
  if (!landingAppKey || landingAppKey === "workspace") return WORKSPACE_URL;
  return PLATFORM_APPS.find((a) => a.id === landingAppKey)?.url ?? WORKSPACE_URL;
}

/** Les entrées de menu que cette session peut réellement ouvrir.
 *
 *  Une entrée sans `permission` reste visible : toutes les apps ne découpent
 *  pas leurs modules en droits, et masquer par défaut ferait disparaître des
 *  menus entiers là où il n'y a rien à filtrer.
 */
export function entreesAutorisees(
  items: NavItem[],
  can: (permission: string) => boolean,
): NavItem[] {
  return items.filter((item) => !item.permission || can(item.permission));
}

/** Le menu tel que ce membre doit le voir : réduit à ses droits, et l'entrée
 *  « Accueil » pointée sur SA page de démarrage.
 *
 *  Elle était câblée sur Workspace partout. Un membre dont le groupe atterrit
 *  sur Operations y trouvait donc un « Accueil » qui l'envoyait vers une app
 *  où il n'a parfois aucun droit — le contraire d'un chez-soi. On ne réécrit
 *  que pour une page de démarrage NON par défaut : ailleurs, le lien relatif
 *  déjà en place évite un rechargement complet.
 */
export function menuDeSession(
  items: NavItem[],
  can: (permission: string) => boolean,
  landingAppKey?: string | null,
): NavItem[] {
  const visibles = entreesAutorisees(items, can);
  if (!landingAppKey || landingAppKey === "workspace") return visibles;
  return visibles.map((item) =>
    item.accueil ? { ...item, href: urlAccueil(landingAppKey) } : item,
  );
}

/** Où atterrit cette session dans cette app : sa PREMIÈRE entrée accessible.
 *
 *  Une adresse en dur — `redirect("/plannings")` — suppose une permission que
 *  l'arrivant n'a pas forcément, et le membre d'un groupe dont c'est la page
 *  de démarrage se prend un 403 juste après s'être connecté. L'ordre du menu
 *  fait foi : c'est déjà celui du plus courant au plus rare.
 *
 *  `sauf` écarte la page courante — sans quoi une app dont l'accueil EST un
 *  module (Hosto, où « / » est la liste des patients) se redirigerait vers
 *  elle-même en boucle.
 */
export function premiereDestination(
  items: NavItem[],
  can: (permission: string) => boolean,
  sauf?: string,
): string | null {
  const ouvertes = entreesAutorisees(items, can).filter(
    (item) => item.href !== sauf && !item.href.startsWith("http"),
  );
  return ouvertes[0]?.href ?? null;
}

/** La porte d'entrée d'une application.
 *
 *  Envoie vers le premier module ouvert à cette session. Quand il n'y en a
 *  aucun, le DIT — au lieu de laisser un 403 qui ressemble à une panne de
 *  compte alors que c'est un droit qui manque.
 */
export function AccueilApp({
  items,
  can,
  appName,
  accueil,
  prenom,
  sauf = "/",
  pret = true,
}: {
  items: NavItem[];
  can: (permission: string) => boolean;
  appName: string;
  /** L'accueil résolu du membre. Quand son groupe a choisi des raccourcis, ils
   *  passent AVANT la redirection : c'est un écran voulu, pas un pis-aller. */
  accueil?: AccueilResolu;
  prenom?: string;
  /** Chemin à ne pas proposer — la page courante, en général « / ». */
  sauf?: string;
  /** `false` tant que la session n'est pas chargée : rediriger sur des
   *  permissions encore vides enverrait tout le monde sur l'écran vide. */
  pret?: boolean;
}) {
  const router = useRouter();
  const raccourcis =
    accueil?.accueil_personnalise && accueil.liens_rapides.length > 0 ? accueil : null;
  const destination = pret && !raccourcis ? premiereDestination(items, can, sauf) : null;

  useEffect(() => {
    // `replace` et non `push` : le bouton Retour doit ramener d'où l'on vient,
    // pas sur une porte qui redirige aussitôt.
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (!pret || destination) return null;
  if (raccourcis) return <AccueilRaccourcis accueil={raccourcis} prenom={prenom} />;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <LockOutlined style={{ fontSize: 44 }} className="text-outline" />
      <h1 className="mt-3 font-display text-headline-sm text-on-surface">
        Aucun module ouvert
      </h1>
      <p className="mt-2 max-w-[52ch] text-body-md text-on-surface-variant">
        Vous avez accès à {appName}, mais aucun de ses modules ne vous est ouvert. Demandez à
        l&apos;administrateur de votre espace de travail d&apos;ajouter les droits qui vous
        manquent.
      </p>
    </div>
  );
}
