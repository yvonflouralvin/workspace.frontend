// POURQUOI UNE CONFIGURATION DÉPOSÉE AU RUNTIME
//
// Le navigateur ne peut pas lire l'environnement du conteneur : une variable
// `NEXT_PUBLIC_*` est FIGÉE dans le bundle à la compilation. Construire l'image
// d'une application une seule fois pour tous les clients est donc incompatible
// avec une clé par instance — l'image publiée embarquait le message d'erreur à
// la place de la clé, et le navigateur échouait là où le serveur allait bien.
//
// La configuration est donc DÉPOSÉE au démarrage par le serveur, qui lit son
// propre environnement à chaque rendu (`ConfigReseau`, monté par le layout
// racine de l'application).
//
// Le repli sur l'environnement de compilation RESTE en place : une application
// pas encore migrée se comporte exactement comme avant. Et la valeur déposée ne
// l'emporte que si elle est non vide — une configuration incomplète ne peut
// donc jamais masquer une clé qui marchait.

export type ConfigReseauClient = {
  mode?: string;
  cle?: string;
  /** Domaines publics des applications, par identifiant d'app (`hosto`,
   *  `ventes`…). Même raison que la clé : ils sont propres au client, et une
   *  variable `NEXT_PUBLIC_*` est figée dans le bundle à la compilation. */
  domaines?: Record<string, string | undefined>;
};

let deposee: ConfigReseauClient | null = null;

/** Appelé par `ConfigReseau` avec les valeurs lues dans l'environnement du
 *  conteneur. Idempotent : le composant le rappelle à chaque rendu. */
export function configurerReseauClient(config: ConfigReseauClient): void {
  deposee = config;
}

/** Remet l'état d'origine. Existe pour les tests : sans ça, un cas qui dépose
 *  une configuration contaminerait tous les suivants. */
export function reinitialiserConfigReseauClient(): void {
  deposee = null;
}

export function configReseauClientDeposee(): ConfigReseauClient | null {
  return deposee;
}

// Les lectures ci-dessous sont LITTÉRALES, et doivent le rester : Next ne
// remplace `process.env.NEXT_PUBLIC_X` à la compilation que lorsque le nom est
// écrit en clair. Un accès calculé (`process.env[nom]`) ne serait pas remplacé
// et vaudrait toujours `undefined` dans le navigateur — le repli ne marcherait
// plus pour les applications pas encore migrées.
// La configuration posée par `<ConfigGlobale>` dans le document. Lue ici, et
// non capturée dans une constante : ce module peut être évalué avant le script.
function globale(): ConfigReseauClient | undefined {
  try {
    return (globalThis as { __WD_CONFIG__?: ConfigReseauClient }).__WD_CONFIG__;
  } catch {
    return undefined;
  }
}

function envPublicMode(): string | undefined {
  try {
    return process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION || undefined;
  } catch {
    return undefined;
  }
}

function envPublicCle(): string | undefined {
  try {
    return process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY || undefined;
  } catch {
    return undefined;
  }
}

// Chemin du rendu serveur : le corps d'un composant client s'exécute aussi au
// SSR, où l'environnement complet est disponible.
function envServeurMode(): string | undefined {
  try {
    return process.env.NETWORK_ENCRYPTION || undefined;
  } catch {
    return undefined;
  }
}

function envServeurCle(): string | undefined {
  try {
    return process.env.NETWORK_ENCRYPTION_KEY || undefined;
  } catch {
    return undefined;
  }
}

/** Le domaine public d'une application, tel que le serveur l'a déposé.
 *
 *  `undefined` quand rien n'a été déposé pour cette app : l'appelant garde son
 *  repli (la variable figée au build, puis l'adresse de développement). Un
 *  domaine déposé VIDE ne l'emporte donc pas — un dépôt incomplet ne peut
 *  qu'améliorer, jamais remplacer un lien qui marchait par un lien mort. */
export function domaineDepose(app: string): string | undefined {
  return (
    (deposee?.domaines?.[app] || undefined) ??
    // Le navigateur : posé par `<ConfigGlobale>` à l'analyse du document, donc
    // disponible même pour une constante de module.
    (globale()?.domaines?.[app] || undefined) ??
    // Le serveur : une constante de module y est évaluée avant tout rendu, donc
    // avant tout dépôt, et la globale n'y existe pas. L'environnement du
    // conteneur, lui, est lisible dès l'import.
    (domainesDepuisEnv()[app] || undefined)
  );
}

export function isServerEncrypted(): boolean {
  return process.env.NETWORK_ENCRYPTION !== "clear";
}

export function getServerKey(): string {
  const key = process.env.NETWORK_ENCRYPTION_KEY;
  if (!key) throw new Error("NETWORK_ENCRYPTION_KEY is not set");
  return key;
}

/** La configuration à déposer, lue dans l'environnement du CONTENEUR.
 *
 *  Appelée côté serveur (layout racine, ou `getServerSession` qui le fait pour
 *  les 17 apps qui montent `SessionProvider`). Vit ici plutôt que dans chaque
 *  appelant : une copie par app serait une occasion de divergence par app. */
export function configReseauDepuisEnv(): ConfigReseauClient {
  return {
    mode: process.env.NETWORK_ENCRYPTION,
    cle: process.env.NETWORK_ENCRYPTION_KEY,
    domaines: domainesDepuisEnv(),
  };
}

/** Les domaines publics lus dans l'environnement du CONTENEUR.
 *
 *  La source est `<APP>_APP_URL`, qui existe DÉJÀ dans le .env de chaque
 *  instance (19 variables, vérifié sur la recette et la production) et que
 *  `render-client.sh` engendre depuis `--domain`. Rien à ajouter côté infra :
 *  la valeur était là, c'est le navigateur qui ne pouvait pas l'atteindre.
 *
 *  Ne pas confondre avec `WORKSPACE_DOMAIN`, qui n'a PAS de schéma (il sert au
 *  cookie et au proxy) : s'en servir comme lien produirait une adresse sans
 *  « https:// ».
 *
 *  Les noms sont écrits en clair, un par app : un accès calculé
 *  (`process.env[nom]`) ne serait pas remplacé par Next dans un bundle client,
 *  et cette même fonction sert aux deux côtés. */
export function domainesDepuisEnv(): Record<string, string | undefined> {
  return {
    workspace: process.env.WORKSPACE_APP_URL,
    auth: process.env.AUTH_APP_URL,
    hr: process.env.HR_APP_URL,
    approval_flows: process.env.APPROVAL_FLOWS_APP_URL,
    hosto: process.env.HOSTO_APP_URL,
    isp: process.env.ISP_APP_URL,
    academique: process.env.ACADEMIQUE_APP_URL,
    sgr: process.env.SGR_APP_URL,
    tiers: process.env.TIERS_APP_URL,
    audit_missions: process.env.AUDIT_MISSIONS_APP_URL,
    comptabilite: process.env.COMPTABILITE_APP_URL,
    business_firm_missions: process.env.BUSINESS_FIRM_MISSIONS_APP_URL,
    operations: process.env.OPERATIONS_APP_URL,
    stock: process.env.STOCK_APP_URL,
    documents: process.env.DOCUMENTS_APP_URL,
    ventes: process.env.VENTES_APP_URL,
    dashboard: process.env.DASHBOARD_APP_URL,
    website: process.env.WEBSITE_APP_URL,
  };
}

export function isClientEncrypted(): boolean {
  const mode =
    (deposee?.mode || undefined) ??
    (globale()?.mode || undefined) ??
    envPublicMode() ??
    envServeurMode();
  return mode !== "clear";
}

export function getClientKey(): string {
  const cle =
    (deposee?.cle || undefined) ??
    (globale()?.cle || undefined) ??
    envPublicCle() ??
    envServeurCle();
  if (!cle) {
    throw new Error(
      "Clé de chiffrement absente côté client : ni déposée au démarrage " +
        "(<ConfigReseau>) ni inlinée à la compilation " +
        "(NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY).",
    );
  }
  return cle;
}
