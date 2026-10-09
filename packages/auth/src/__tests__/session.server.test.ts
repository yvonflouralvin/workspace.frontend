import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `next/headers` n'existe pas hors d'un rendu Next : on le remplace par un
// espion, ce qui permet justement de vérifier QU'IL EST APPELÉ — la propriété
// qu'on veut garder.
const cookiesAppele = vi.fn();
vi.mock("next/headers.js", () => ({
  cookies: async () => {
    cookiesAppele();
    return { toString: () => entetesCookie };
  },
  headers: async () => ({ get: () => null }),
}));
vi.mock("next/navigation.js", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

let entetesCookie = "";

const { getServerSession } = await import("../api/session.server.js");

const VARIABLES = [
  "AUTH_API_URL",
  "NETWORK_ENCRYPTION",
  "NETWORK_ENCRYPTION_KEY",
] as const;

let sauvegarde: Record<string, string | undefined>;
let fetchOrigine: typeof globalThis.fetch;

beforeEach(() => {
  sauvegarde = {};
  for (const v of VARIABLES) {
    sauvegarde[v] = process.env[v];
    delete process.env[v];
  }
  entetesCookie = "";
  cookiesAppele.mockClear();
  fetchOrigine = globalThis.fetch;
});

afterEach(() => {
  for (const v of VARIABLES) {
    if (sauvegarde[v] === undefined) delete process.env[v];
    else process.env[v] = sauvegarde[v];
  }
  globalThis.fetch = fetchOrigine;
});

// CE QUI EST EN JEU : l'accès aux cookies est le signal par lequel Next sait
// qu'une page dépend de la requête. Placé derrière un retour anticipé, il ne se
// produisait pas à la construction — où `AUTH_API_URL` est absente, turbo
// filtrant l'environnement des tâches — et Next PRÉRENDAIT des écrans par
// utilisateur. Mesuré sur `tiers` : 6 pages prérendues, dont /tiers et
// /parametres, servies depuis la construction cookie ou pas. Après correction :
// une seule, interne à Next.
describe("le signal de rendu dynamique", () => {
  it("lit les cookies MÊME sans AUTH_API_URL", async () => {
    await getServerSession();
    expect(cookiesAppele).toHaveBeenCalled();
  });

  it("lit les cookies même quand il n'y en a aucun", async () => {
    process.env.AUTH_API_URL = "http://auth.test";
    entetesCookie = "";
    await getServerSession();
    expect(cookiesAppele).toHaveBeenCalled();
  });
});

// Un écran anonyme chiffre lui aussi ses appels : c'est à la connexion que la
// clé manquante se voyait. La configuration doit donc voyager sur TOUS les
// chemins, y compris ceux qui rendent une session vide.
describe("la configuration réseau voyage sur tous les chemins de retour", () => {
  beforeEach(() => {
    process.env.NETWORK_ENCRYPTION = "encrypted";
    process.env.NETWORK_ENCRYPTION_KEY = "cle-de-test";
  });

  it("sans AUTH_API_URL", async () => {
    const s = await getServerSession();
    expect(s.config_reseau).toEqual({ mode: "encrypted", cle: "cle-de-test" });
    expect(s.authenticated).toBe(false);
  });

  it("sans cookie", async () => {
    process.env.AUTH_API_URL = "http://auth.test";
    const s = await getServerSession();
    expect(s.config_reseau).toEqual({ mode: "encrypted", cle: "cle-de-test" });
  });

  it("quand auth répond une erreur", async () => {
    process.env.AUTH_API_URL = "http://auth.test";
    entetesCookie = "access_token=x";
    globalThis.fetch = vi.fn(
      async () => new Response("non", { status: 500 }),
    ) as unknown as typeof globalThis.fetch;
    const s = await getServerSession();
    expect(s.config_reseau).toEqual({ mode: "encrypted", cle: "cle-de-test" });
  });

  it("quand le réseau tombe", async () => {
    process.env.AUTH_API_URL = "http://auth.test";
    entetesCookie = "access_token=x";
    globalThis.fetch = vi.fn(async () => {
      throw new Error("injoignable");
    }) as unknown as typeof globalThis.fetch;
    const s = await getServerSession();
    expect(s.config_reseau).toEqual({ mode: "encrypted", cle: "cle-de-test" });
  });

  it("et quand tout va bien, sans écraser la charge d'auth", async () => {
    process.env.AUTH_API_URL = "http://auth.test";
    entetesCookie = "access_token=x";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ authenticated: true, user: { id: 7 }, permissions: ["a"] }),
          { status: 200 },
        ),
    ) as unknown as typeof globalThis.fetch;
    const s = await getServerSession();
    expect(s.authenticated).toBe(true);
    expect(s.user).toEqual({ id: 7 });
    expect(s.permissions).toEqual(["a"]);
    expect(s.config_reseau).toEqual({ mode: "encrypted", cle: "cle-de-test" });
  });
});
