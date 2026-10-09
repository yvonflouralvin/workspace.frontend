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

export function isServerEncrypted(): boolean {
  return process.env.NETWORK_ENCRYPTION !== "clear";
}

export function getServerKey(): string {
  const key = process.env.NETWORK_ENCRYPTION_KEY;
  if (!key) throw new Error("NETWORK_ENCRYPTION_KEY is not set");
  return key;
}

export function isClientEncrypted(): boolean {
  const mode =
    (deposee?.mode || undefined) ?? envPublicMode() ?? envServeurMode();
  return mode !== "clear";
}

export function getClientKey(): string {
  const cle =
    (deposee?.cle || undefined) ?? envPublicCle() ?? envServeurCle();
  if (!cle) {
    throw new Error(
      "Clé de chiffrement absente côté client : ni déposée au démarrage " +
        "(<ConfigReseau>) ni inlinée à la compilation " +
        "(NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY).",
    );
  }
  return cle;
}
