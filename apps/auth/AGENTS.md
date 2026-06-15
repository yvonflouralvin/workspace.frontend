<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Auth App (frontend)

Next.js 16 (App Router) app, served on port **3001**, that owns the sign-in
and sign-up UI for the SAAS Workspace platform. On success it redirects the
browser to the `workspace` app (port 3005).

## Pages

- `app/page.tsx` — **Login**, 2-step form:
  1. Email → `checkEmail()`. If the account doesn't exist, shows an inline
     error with a link to `/register`.
  2. Password → `login()`. On success, redirects to
     `NEXT_PUBLIC_WORKSPACE_DOMAIN`.
- `app/register/page.tsx` — **Sign-up wizard**, 4 steps (with a progress
  indicator and back navigation):
  1. Email → `checkEmail()`; if it already exists, error + link to `/`.
  2. Full name.
  3. Password + confirmation (min 8 chars).
  4. Workspace name — pre-filled with the part of the email before `@`
     (slugified), editable.
  On submit: `register()` → `login()` → redirect to
  `NEXT_PUBLIC_WORKSPACE_DOMAIN`.

## API layer

- `app/lib/api.ts` — client-side helpers (`checkEmail`, `login`, `register`)
  that call **local** Next.js route handlers under `/api/*`, not the backend
  directly.
- `app/api/check-email/route.ts`, `app/api/login/route.ts`,
  `app/api/register/route.ts` — server-side proxies to the Flask backend
  (`AUTH_API_URL`, defaults to `http://127.0.0.1:5000`). The `/api/login`
  route reads `access_token`/`refresh_token` from the backend's JSON
  response and sets them as `httpOnly` cookies **without a `Domain`
  attribute** on its own response.

## Why the proxy + host-only cookie trick

- The backend must be reached at `127.0.0.1:5000` (see
  `backends/auth/AGENTS.md` — macOS AirPlay squats `localhost:5000`).
- Calling the backend from the browser would therefore set cookies scoped to
  `127.0.0.1`, which the `workspace` app (loaded from `localhost:3005`) would
  never see.
- By proxying through this app's own server (server-to-server fetch to
  `127.0.0.1:5000`, no browser involved) and re-issuing the cookies from a
  `localhost`-origin response, the cookies become **host-only for
  `localhost`** — not port-scoped, so they're shared with `localhost:3005`.

## Dev gotchas

- **Always open this app via `http://localhost:3001`**, not
  `http://127.0.0.1:3001` — otherwise the session cookie won't be visible to
  the `workspace` app.
- `next.config.ts` sets `allowedDevOrigins: ["127.0.0.1", "localhost"]` so
  the HMR websocket isn't rejected regardless of which host you use.
- Relevant env vars (`.env`): `AUTH_API_URL` (server-only), `NEXT_PUBLIC_AUTH_API`,
  `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`, `NEXT_PUBLIC_AUTH_API_HR_DOMAIN`,
  `NEXT_PUBLIC_WORKSPACE_DOMAIN`.

## Related

- `apps/workspace/middleware.ts` redirects to
  `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN` (this app) when the `access_token` cookie
  is missing.
- `packages/auth` (`@repo/auth`) — shared `SessionProvider` / Zustand store /
  `getSession()`. Note: `getSession()` currently calls
  `NEXT_PUBLIC_AUTH_API` directly from the browser and is **not** yet proxied
  the same way — it won't see the `localhost` host-only cookie set by this
  app. Not an issue for the login/register flow itself, but should be
  proxied the same way before the `workspace` app relies on session data.
