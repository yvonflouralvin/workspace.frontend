const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: !!COOKIE_DOMAIN,
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};
