const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

// Deux instances sur le même domaine (prod + uat) partagent COOKIE_DOMAIN : seul
// le NOM du cookie les isole. Il doit valoir celui du backend auth et celui que
// lisent les proxy.ts des apps — sinon la connexion réussit et aucune app ne
// reconnaît la session.
export const ACCESS_TOKEN_COOKIE = process.env.ACCESS_TOKEN_COOKIE_NAME ?? "access_token";
export const REFRESH_TOKEN_COOKIE = process.env.REFRESH_TOKEN_COOKIE_NAME ?? "refresh_token";

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: !!COOKIE_DOMAIN,
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};
