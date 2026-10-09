import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  configReseauDepuisEnv,
  domaineDepose,
  configurerReseauClient,
  getClientKey,
  getServerKey,
  isClientEncrypted,
  isServerEncrypted,
  reinitialiserConfigReseauClient,
} from "../config";

// Une clé AES valide décode vers 16, 24 ou 32 octets. On en fabrique trois
// DISTINCTES : c'est la seule façon de prouver laquelle a servi.
const cleDe = (nom: string) =>
  Buffer.from(nom.padEnd(32, "0").slice(0, 32)).toString("base64");

const CLE_DEPOSEE = cleDe("deposee");
const CLE_INLINEE = cleDe("inlinee");
const CLE_SERVEUR = cleDe("serveur");

const VARIABLES = [
  "NEXT_PUBLIC_NETWORK_ENCRYPTION",
  "NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY",
  "NETWORK_ENCRYPTION",
  "NETWORK_ENCRYPTION_KEY",
] as const;

let sauvegarde: Record<string, string | undefined>;

beforeEach(() => {
  sauvegarde = {};
  for (const v of VARIABLES) {
    sauvegarde[v] = process.env[v];
    delete process.env[v];
  }
  reinitialiserConfigReseauClient();
});

afterEach(() => {
  for (const v of VARIABLES) {
    if (sauvegarde[v] === undefined) delete process.env[v];
    else process.env[v] = sauvegarde[v];
  }
  reinitialiserConfigReseauClient();
});

describe("configuration déposée au démarrage", () => {
  it("l'emporte sur la clé figée à la compilation", () => {
    process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY = CLE_INLINEE;
    configurerReseauClient({ cle: CLE_DEPOSEE });
    expect(getClientKey()).toBe(CLE_DEPOSEE);
  });

  it("un mode « clear » déposé désactive le chiffrement même si le bundle dit l'inverse", () => {
    process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION = "encrypted";
    configurerReseauClient({ mode: "clear" });
    expect(isClientEncrypted()).toBe(false);
  });

  // La propriété qui rend la migration sûre : un dépôt incomplet ne peut
  // qu'améliorer la situation, jamais casser une application qui marchait.
  it("une clé déposée VIDE ne masque pas la clé figée à la compilation", () => {
    process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY = CLE_INLINEE;
    configurerReseauClient({ cle: "" });
    expect(getClientKey()).toBe(CLE_INLINEE);
  });

  it("un mode déposé vide retombe sur l'environnement", () => {
    process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION = "clear";
    configurerReseauClient({ mode: "" });
    expect(isClientEncrypted()).toBe(false);
  });
});

describe("repli — une application pas encore migrée ne change pas de comportement", () => {
  it("utilise la clé figée à la compilation quand rien n'est déposé", () => {
    process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY = CLE_INLINEE;
    expect(getClientKey()).toBe(CLE_INLINEE);
  });

  it("utilise l'environnement du serveur au rendu SSR, faute d'inlinée", () => {
    process.env.NETWORK_ENCRYPTION_KEY = CLE_SERVEUR;
    expect(getClientKey()).toBe(CLE_SERVEUR);
  });

  it("chiffre par défaut quand aucun mode n'est donné nulle part", () => {
    expect(isClientEncrypted()).toBe(true);
  });
});

// Le défaut du 9 octobre 2026 : les 19 images, construites en intégration
// continue, ne portaient AUCUNE variable NEXT_PUBLIC_ — le bundle embarquait le
// message d'erreur à la place de la clé. Ces deux cas sont ceux qui l'auraient
// vu avant le client.
describe("régression : image construite sans les variables publiques", () => {
  it("la clé déposée suffit, sans aucune variable NEXT_PUBLIC_", () => {
    expect(process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY).toBeUndefined();
    configurerReseauClient({ mode: "encrypted", cle: CLE_DEPOSEE });
    expect(getClientKey()).toBe(CLE_DEPOSEE);
    expect(isClientEncrypted()).toBe(true);
  });

  it("sans variable publique NI dépôt, l'erreur nomme les deux chemins", () => {
    let message = "";
    try {
      getClientKey();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("ConfigReseau");
    expect(message).toContain("NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY");
  });
});

// C'est ce que `getServerSession` appelle pour les 17 apps qui montent
// SessionProvider : un seul point de lecture, au lieu d'une copie par layout.
describe("configReseauDepuisEnv — lecture de l'environnement du conteneur", () => {
  it("rend les valeurs serveur", () => {
    process.env.NETWORK_ENCRYPTION = "encrypted";
    process.env.NETWORK_ENCRYPTION_KEY = CLE_SERVEUR;
    const c = configReseauDepuisEnv();
    expect(c.mode).toBe("encrypted");
    expect(c.cle).toBe(CLE_SERVEUR);
  });

  it("rend des champs vides quand l'environnement est muet", () => {
    const c = configReseauDepuisEnv();
    expect(c.mode).toBeUndefined();
    expect(c.cle).toBeUndefined();
  });

  it("porte les domaines des applications", () => {
    process.env.HOSTO_APP_URL = "https://hosto.client.test";
    const c = configReseauDepuisEnv();
    expect(c.domaines?.hosto).toBe("https://hosto.client.test");
    delete process.env.HOSTO_APP_URL;
  });

  // La propriété qui rend le déploiement progressif sûr : une app dont le
  // conteneur n'a pas encore la variable SERVEUR continue de marcher sur la clé
  // figée à la compilation. Sans ça, déployer ce mécanisme casserait toute app
  // dont le .env n'a pas été mis à jour — c'est-à-dire tous les clients
  // existants.
  it("déposer un environnement muet ne casse pas une app qui marchait", () => {
    process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY = CLE_INLINEE;
    configurerReseauClient(configReseauDepuisEnv());
    expect(getClientKey()).toBe(CLE_INLINEE);
    expect(isClientEncrypted()).toBe(true);
  });

  it("et un environnement renseigné l'emporte bien", () => {
    process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY = CLE_INLINEE;
    process.env.NETWORK_ENCRYPTION_KEY = CLE_SERVEUR;
    configurerReseauClient(configReseauDepuisEnv());
    expect(getClientKey()).toBe(CLE_SERVEUR);
  });
});

// Les coquilles d'application déclarent leurs liens dans des constantes de
// MODULE, évaluées au chargement du chunk — avant tout rendu React. Le dépôt au
// rendu arrive trop tard pour elles, d'où la variable globale posée par un
// script à l'analyse du document.
describe("domaineDepose — le domaine public d'une application", () => {
  const G = globalThis as { __WD_CONFIG__?: unknown };

  afterEach(() => {
    delete G.__WD_CONFIG__;
  });

  it("lit la configuration déposée au rendu", () => {
    configurerReseauClient({ domaines: { hosto: "https://h.test" } });
    expect(domaineDepose("hosto")).toBe("https://h.test");
  });

  it("lit la variable globale quand rien n'a été déposé", () => {
    G.__WD_CONFIG__ = { domaines: { hosto: "https://global.test" } };
    expect(domaineDepose("hosto")).toBe("https://global.test");
  });

  it("le dépôt au rendu l'emporte sur la globale", () => {
    G.__WD_CONFIG__ = { domaines: { hosto: "https://global.test" } };
    configurerReseauClient({ domaines: { hosto: "https://rendu.test" } });
    expect(domaineDepose("hosto")).toBe("https://rendu.test");
  });

  it("rend undefined pour une app inconnue — l'appelant garde son repli", () => {
    G.__WD_CONFIG__ = { domaines: { hosto: "https://h.test" } };
    expect(domaineDepose("inexistante")).toBeUndefined();
  });

  // Un domaine déposé VIDE ne doit pas remplacer un lien qui marchait par un
  // lien mort : c'est ce qui rend le déploiement progressif sûr.
  it("un domaine vide ne masque rien", () => {
    G.__WD_CONFIG__ = { domaines: { hosto: "https://global.test" } };
    configurerReseauClient({ domaines: { hosto: "" } });
    expect(domaineDepose("hosto")).toBe("https://global.test");
  });

  it("la clé aussi peut venir de la globale", () => {
    G.__WD_CONFIG__ = { mode: "encrypted", cle: CLE_SERVEUR };
    expect(getClientKey()).toBe(CLE_SERVEUR);
    expect(isClientEncrypted()).toBe(true);
  });
});

describe("isolation entre deux cas", () => {
  it("réinitialiser rend l'état d'origine", () => {
    configurerReseauClient({ cle: CLE_DEPOSEE });
    reinitialiserConfigReseauClient();
    expect(() => getClientKey()).toThrow();
  });
});

describe("côté serveur (BFF) — inchangé par la migration", () => {
  it("lit NETWORK_ENCRYPTION_KEY", () => {
    process.env.NETWORK_ENCRYPTION_KEY = CLE_SERVEUR;
    expect(getServerKey()).toBe(CLE_SERVEUR);
  });

  it("lève quand la clé serveur est absente", () => {
    expect(() => getServerKey()).toThrow(/NETWORK_ENCRYPTION_KEY/);
  });

  it("n'est PAS influencé par une configuration client déposée", () => {
    process.env.NETWORK_ENCRYPTION_KEY = CLE_SERVEUR;
    configurerReseauClient({ mode: "clear", cle: CLE_DEPOSEE });
    expect(getServerKey()).toBe(CLE_SERVEUR);
    expect(isServerEncrypted()).toBe(true);
  });
});
