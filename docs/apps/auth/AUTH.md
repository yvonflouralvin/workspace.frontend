# App Auth — Documentation

**Port :** 3001
**Next.js 16, App Router**
**Rôle :** Connexion et inscription. Redirige vers `workspace` (3005) en cas de succès.

---

## Pages

### `/` — Login (`app/page.tsx`)

Formulaire 2 étapes :
1. **Email** → `checkEmail()`. Si le compte n'existe pas : erreur inline + lien `/register`.
2. **Password** → `login()`. En cas de succès : redirect vers `NEXT_PUBLIC_WORKSPACE_DOMAIN`.

Bouton "Changer" sur l'étape password permet de revenir à l'étape email.

### `/register` — Inscription (`app/register/page.tsx`)

Wizard 4 étapes avec barre de progression et navigation "Retour" :
1. **Email** → `checkEmail()`. Si le compte existe déjà : erreur + lien `/`.
2. **Nom complet**
3. **Mot de passe** + confirmation (min 8 caractères)
4. **Nom du workspace** — pré-rempli avec la partie avant `@` de l'email (slugifiée), éditable.
   Inclut aussi un sélecteur de **type** (deux cartes "Individuel"/"Organisation",
   `Individuel` présélectionné) — `workspaceType` envoyé comme `workspace_type` à
   `POST /auth/register`. Fixé à la création, pas modifiable depuis cette app (voir
   `backends/docs/services/auth/AUTH.md`, modèle `Workspace`).

À la soumission finale : `register()` → `login()` → redirect vers `NEXT_PUBLIC_WORKSPACE_DOMAIN`.

---

## Couche API (`app/lib/api.ts` + `app/api/*/route.ts`)

Le client appelle des **route handlers Next.js locaux** (sous `/api/*`), jamais le backend directement.

```
Browser → /api/check-email → fetch(AUTH_API_URL/auth/check-email)
Browser → /api/login       → fetch(AUTH_API_URL/auth/login) → set httpOnly cookies
Browser → /api/register    → fetch(AUTH_API_URL/auth/register)
```

### Fonctions client (`app/lib/api.ts`)

```ts
checkEmail(email)                               // → { exists: boolean }
login(email, password)                          // → void (cookies set via proxy)
register(email, password, fullName, workspaceName, workspaceType) // → void
```

---

## Cookie Gotcha — Pourquoi le proxy {#cookie-gotcha}

**Problème :** le backend tourne sur `127.0.0.1:5000` (macOS AirPlay occupe `localhost:5000`).
Si le browser appelait le backend directement, les cookies `access_token` / `refresh_token`
seraient scopés à `127.0.0.1` — invisibles depuis `localhost:3005` (workspace).

**Solution :** le route handler `/api/login` appelle le backend server-to-server
(`127.0.0.1:5000`, pas de browser impliqué), lit les tokens de la réponse JSON, puis
les ré-émet comme cookies `httpOnly` **sans attribut `Domain`** dans sa propre réponse.
Résultat : cookies host-only pour `localhost` — **pas scopés au port**, donc partagés
entre `localhost:3001` et `localhost:3005`.

**Règle absolue :** toujours ouvrir cette app via `http://localhost:3001`, jamais
`http://127.0.0.1:3001` — sinon le cookie ne sera pas visible par workspace.

---

## Variables d'environnement

| Variable                          | Portée  | Valeur dev              |
|-----------------------------------|---------|-------------------------|
| `AUTH_API_URL`                    | Server  | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_AUTH_API`            | Browser | `http://127.0.0.1:5000` |
| `NEXT_PUBLIC_WORKSPACE_DOMAIN`    | Browser | `http://localhost:3005`  |
| `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`| Browser | `http://localhost:3001`  |

---

## Config notable

- `next.config.ts` : `allowedDevOrigins: ["127.0.0.1", "localhost"]` — le HMR WebSocket
  fonctionne quel que soit le host utilisé.
- `tailwind.config.ts` : étend `@repo/tailwind-config` — tous les tokens du design system
  sont disponibles.

---

## Relation avec les autres apps

- `apps/workspace/proxy.ts` — redirige vers `NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN`
  (cette app) quand le cookie `access_token` est absent.
- `packages/auth` (`@repo/auth`) — deux chemins de lecture de session :
  - **Server-side** (`getServerSession()`, `api/session.server.ts`) : appelle
    `AUTH_API_URL` directement depuis le serveur Next (cookies forwardés via
    `next/headers`), utilisé dans le `RootLayout` de `workspace` pour hydrater la
    session avant le premier rendu. Voir `docs/apps/workspace/WORKSPACE.md#session-ssr`.
  - **Client-side** (`getSession()`, `api/session.ts`) : appelle le proxy local
    `NEXT_PUBLIC_SESSION_API` (`/api/auth/session`), utilisé en fallback quand
    aucune session n'a été pré-chargée côté serveur (apps sans SSR de session).
